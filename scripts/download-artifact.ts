import { createHash } from "node:crypto"
import { writeFile } from "node:fs/promises"
import process from "node:process"
import { setTimeout as sleep } from "node:timers/promises"
import { z } from "zod/v4"

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"

import { MILLISECONDS_PER_MINUTE, MILLISECONDS_PER_SECOND } from "~/src/lib/duration"

import { FAILURE_EXIT_CODE, scriptArguments } from "./run-command.ts"

const POLL_INTERVAL_MS = 5000
const REQUEST_TIMEOUT_MS = 30_000
const DOWNLOAD_TIMEOUT_MS = 60_000
const PAGE_SIZE = 100

export const WAIT_LIMIT_MINUTES = 15

const CALLER_SEPARATOR = " / "
const ETAG_HEADER = "etag"
const LOCATION_HEADER = "location"
const NETWORK_ERROR = "error"
const DIGEST_ALGORITHM = "sha256"

export const JOB_STATUS = { COMPLETED: "completed", IN_PROGRESS: "in_progress", QUEUED: "queued" } as const

export const JOB_CONCLUSION = { CANCELLED: "cancelled", FAILURE: "failure", SUCCESS: "success" } as const

export const JOB_STATE = { FAILED: "failed", PENDING: "pending", READY: "ready" } as const

type JobState = (typeof JOB_STATE)[keyof typeof JOB_STATE]

const stepSchema = z.object({ conclusion: z.string().nullable(), name: z.string() })
const jobSchema = z.object({
  conclusion: z.string().nullable(),
  html_url: z.string(),
  id: z.int(),
  name: z.string(),
  started_at: z.string(),
  status: z.string(),
  steps: z.array(stepSchema).default([]),
})
const jobsSchema = z.object({ jobs: z.array(jobSchema) })
const artifactSchema = z.object({
  created_at: z.string().nullable(),
  digest: z.string().nullable(),
  expired: z.boolean(),
  id: z.int(),
  name: z.string(),
})
const artifactsSchema = z.object({ artifacts: z.array(artifactSchema) })

const argumentsSchema = z.tuple([z.string().min(1), z.string().min(1), z.string().min(1), z.string().min(1)])
const environmentSchema = z.object({
  GH_TOKEN: z.string().min(1),
  GITHUB_API_URL: z.url(),
  GITHUB_REPOSITORY: z.string().min(1),
  GITHUB_RUN_ID: z.string().regex(/^\d+$/u),
})

export type Job = z.infer<typeof jobSchema>

export type Artifact = z.infer<typeof artifactSchema>

interface Target {
  readonly artifact: string
  readonly job: string
  readonly step: string
}

export const isNamed =
  (name: string) =>
  (job: Pick<Job, "name">): boolean =>
    job.name === name || job.name.endsWith(`${CALLER_SEPARATOR}${name}`)

export const jobState = (job: Job, step: string): JobState => {
  if (job.steps.some((each) => each.name === step && each.conclusion === JOB_CONCLUSION.SUCCESS)) {
    return JOB_STATE.READY
  }

  if (job.status === JOB_STATUS.COMPLETED || job.steps.some((each) => each.conclusion === JOB_CONCLUSION.FAILURE)) {
    return JOB_STATE.FAILED
  }

  return JOB_STATE.PENDING
}

export const uploadedArtifact = (artifacts: readonly Artifact[], name: string, since: string): Artifact | undefined =>
  artifacts
    .flatMap((each) =>
      each.name === name && !each.expired && each.created_at !== null ? [{ each, uploaded: Date.parse(each.created_at) }] : [],
    )
    .filter(({ uploaded }) => uploaded >= Date.parse(since))
    .toSorted((first, second) => second.uploaded - first.uploaded)
    .at(0)?.each

export const digestOf = (bytes: Uint8Array): string => `${DIGEST_ALGORITHM}:${createHash(DIGEST_ALGORITHM).update(bytes).digest("hex")}`

export const matchesDigest = (artifact: Pick<Artifact, "digest">, bytes: Uint8Array): boolean =>
  artifact.digest === null || artifact.digest === digestOf(bytes)

export const failureReport = (job: Job, step: string): string => {
  const failed = job.steps.find((each) => each.conclusion === JOB_CONCLUSION.FAILURE)

  if (failed === undefined) {
    return `"${job.name}" finished with ${String(job.conclusion)} before its step "${step}" succeeded: ${job.html_url}`
  }

  return `"${job.name}" failed in its step "${failed.name}", so its step "${step}" will not run: ${job.html_url}`
}

export const digestReport = (artifact: Pick<Artifact, "digest" | "name">, bytes: Uint8Array): string =>
  `The artifact "${artifact.name}" arrived with the digest ${digestOf(bytes)} instead of ${String(artifact.digest)}.`

export const timeoutReport = ({ job, step }: Pick<Target, "job" | "step">): string =>
  `"${job}" did not finish its step "${step}" within ${String(WAIT_LIMIT_MINUTES)} minutes.`

export const listingTimeoutReport = ({ artifact, job, step }: Target): string =>
  `"${job}" finished its step "${step}", but GitHub did not list the artifact "${artifact}" within ${String(WAIT_LIMIT_MINUTES)} minutes.`

export const downloadTimeoutReport = ({ artifact }: Pick<Target, "artifact">): string =>
  `GitHub listed the artifact "${artifact}" but did not serve it whole within ${String(WAIT_LIMIT_MINUTES)} minutes.`

const fail = (message: string): never => {
  process.stdout.write(`::error::${message}\n`)
  process.exit(FAILURE_EXIT_CODE)
}

const attempt = async (url: string, init: RequestInit): Promise<Response> => {
  try {
    return await fetch(url, init)
  } catch (error) {
    process.stdout.write(`::warning::GitHub did not answer: ${String(error)}\n`)

    return Response.error()
  }
}

if (import.meta.main) {
  const [job, step, artifact, file] = argumentsSchema.parse(scriptArguments())
  const { GH_TOKEN, GITHUB_API_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID } = environmentSchema.parse(process.env)
  const target = { artifact, job, step }
  const started = Date.now()
  const deadline = started + WAIT_LIMIT_MINUTES * MILLISECONDS_PER_MINUTE

  const waited = (): string => `${String(Math.round((Date.now() - started) / MILLISECONDS_PER_SECOND))} s`

  const request = (path: string, conditions: Readonly<Record<string, string>>): Promise<Response> =>
    attempt(`${GITHUB_API_URL}/repos/${GITHUB_REPOSITORY}/${path}`, {
      headers: { accept: "application/vnd.github+json", authorization: `Bearer ${GH_TOKEN}`, ...conditions },
      redirect: "manual",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })

  const pause = async (report: string): Promise<void> => {
    if (Date.now() > deadline) {
      fail(report)
    }

    await sleep(POLL_INTERVAL_MS)
  }

  const warnUnlessUnchanged = (response: Response, subject: string): void => {
    if (response.type !== NETWORK_ERROR && response.status !== HTTP_STATUS.NOT_MODIFIED) {
      process.stdout.write(`::warning::GitHub answered ${String(response.status)} for "${subject}".\n`)
    }
  }

  const nextConditions = (response: Response): Readonly<Record<string, string>> => {
    const etag = response.headers.get(ETAG_HEADER)

    return etag === null ? {} : { "if-none-match": etag }
  }

  const findJob = async (): Promise<number> => {
    const response = await request(`actions/runs/${GITHUB_RUN_ID}/jobs?filter=latest&per_page=${String(PAGE_SIZE)}`, {})
    const jobs = response.ok ? jobsSchema.parse(await response.json()).jobs : []
    const found = jobs.find(isNamed(job))

    if (found !== undefined) {
      return found.id
    }

    await pause(timeoutReport(target))

    return findJob()
  }

  const waitForStep = async (id: number, conditions: Readonly<Record<string, string>>): Promise<Job> => {
    const response = await request(`actions/jobs/${String(id)}`, conditions)

    if (response.status === HTTP_STATUS.OK) {
      const current = jobSchema.parse(await response.json())
      const state = jobState(current, step)

      if (state === JOB_STATE.READY) {
        process.stdout.write(`"${current.name}" finished its step "${step}" after ${waited()} of waiting.\n`)

        return current
      }

      if (state === JOB_STATE.FAILED) {
        fail(failureReport(current, step))
      }

      await pause(timeoutReport(target))

      return waitForStep(id, nextConditions(response))
    }

    warnUnlessUnchanged(response, job)
    await pause(timeoutReport(target))

    return waitForStep(id, conditions)
  }

  const waitForListing = async (since: string, conditions: Readonly<Record<string, string>>): Promise<Artifact> => {
    const path = `actions/runs/${GITHUB_RUN_ID}/artifacts?name=${encodeURIComponent(artifact)}&per_page=${String(PAGE_SIZE)}`
    const response = await request(path, conditions)

    if (response.status === HTTP_STATUS.OK) {
      const found = uploadedArtifact(artifactsSchema.parse(await response.json()).artifacts, artifact, since)

      if (found !== undefined) {
        process.stdout.write(`GitHub listed the artifact "${artifact}" (ID ${String(found.id)}) after ${waited()} of waiting.\n`)

        return found
      }

      await pause(listingTimeoutReport(target))

      return waitForListing(since, nextConditions(response))
    }

    warnUnlessUnchanged(response, artifact)
    await pause(listingTimeoutReport(target))

    return waitForListing(since, conditions)
  }

  const download = async (listed: Artifact): Promise<void> => {
    const retry = async (): Promise<void> => {
      await pause(downloadTimeoutReport(target))

      return download(listed)
    }

    const pointer = await request(`actions/artifacts/${String(listed.id)}/zip`, {})
    const location = pointer.headers.get(LOCATION_HEADER)

    if (pointer.status !== HTTP_STATUS.FOUND || location === null) {
      warnUnlessUnchanged(pointer, artifact)

      return retry()
    }

    const archive = await attempt(location, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) })

    if (!archive.ok) {
      warnUnlessUnchanged(archive, artifact)

      return retry()
    }

    const save = async (bytes: Uint8Array): Promise<void> => {
      if (!matchesDigest(listed, bytes)) {
        process.stdout.write(`::warning::${digestReport(listed, bytes)}\n`)

        return retry()
      }

      await writeFile(file, bytes)
      process.stdout.write(`Downloaded the artifact "${artifact}" (${String(bytes.byteLength)} bytes) after ${waited()} of waiting.\n`)
    }

    const retryAfterBreak = (error: unknown): Promise<void> => {
      process.stdout.write(`::warning::The download of "${artifact}" broke off: ${String(error)}\n`)

      return retry()
    }

    return archive.bytes().then(save, retryAfterBreak)
  }

  const built = await waitForStep(await findJob(), {})
  await download(await waitForListing(built.started_at, {}))
}
