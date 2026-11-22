import process from "node:process"
import { setTimeout as sleep } from "node:timers/promises"
import { z } from "zod/v4"

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"

import { MILLISECONDS_PER_MINUTE, MILLISECONDS_PER_SECOND } from "~/src/lib/duration"

const SCRIPT_ARGUMENTS_START = 2
const FAILURE_EXIT_CODE = 1
const POLL_INTERVAL_MS = 5000
const REQUEST_TIMEOUT_MS = 30_000

export const WAIT_LIMIT_MINUTES = 15

const CALLER_SEPARATOR = " / "
const ETAG_HEADER = "etag"
const NETWORK_ERROR = "error"

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
  status: z.string(),
  steps: z.array(stepSchema).default([]),
})
const jobsSchema = z.object({ jobs: z.array(jobSchema) })

const argumentsSchema = z.tuple([z.string().min(1), z.string().min(1)])
const environmentSchema = z.object({
  GH_TOKEN: z.string().min(1),
  GITHUB_API_URL: z.url(),
  GITHUB_REPOSITORY: z.string().min(1),
  GITHUB_RUN_ID: z.string().regex(/^\d+$/u),
})

export type Job = z.infer<typeof jobSchema>

interface Target {
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

export const failureReport = (job: Job, step: string): string => {
  const failed = job.steps.find((each) => each.conclusion === JOB_CONCLUSION.FAILURE)

  if (failed === undefined) {
    return `"${job.name}" finished with ${String(job.conclusion)} before its step "${step}" succeeded: ${job.html_url}`
  }

  return `"${job.name}" failed in its step "${failed.name}", so its step "${step}" will not run: ${job.html_url}`
}

export const timeoutReport = ({ job, step }: Target): string =>
  `"${job}" did not finish its step "${step}" within ${String(WAIT_LIMIT_MINUTES)} minutes.`

const fail = (message: string): never => {
  process.stdout.write(`::error::${message}\n`)
  process.exit(FAILURE_EXIT_CODE)
}

if (import.meta.main) {
  const [job, step] = argumentsSchema.parse(process.argv.slice(SCRIPT_ARGUMENTS_START))
  const { GH_TOKEN, GITHUB_API_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID } = environmentSchema.parse(process.env)
  const target = { job, step }
  const started = Date.now()
  const deadline = started + WAIT_LIMIT_MINUTES * MILLISECONDS_PER_MINUTE

  const request = async (path: string, conditions: Readonly<Record<string, string>>): Promise<Response> => {
    try {
      return await fetch(`${GITHUB_API_URL}/repos/${GITHUB_REPOSITORY}/${path}`, {
        headers: { accept: "application/vnd.github+json", authorization: `Bearer ${GH_TOKEN}`, ...conditions },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
    } catch (error) {
      process.stdout.write(`::warning::GitHub's API did not answer: ${String(error)}\n`)

      return Response.error()
    }
  }

  const pause = async (): Promise<void> => {
    if (Date.now() > deadline) {
      fail(timeoutReport(target))
    }

    await sleep(POLL_INTERVAL_MS)
  }

  const findJob = async (): Promise<number> => {
    const response = await request(`actions/runs/${GITHUB_RUN_ID}/jobs?filter=latest&per_page=100`, {})
    const found = response.ok ? jobsSchema.parse(await response.json()).jobs.find(isNamed(job)) : undefined

    if (found !== undefined) {
      return found.id
    }

    await pause()

    return findJob()
  }

  const waitFor = async (id: number, conditions: Readonly<Record<string, string>>): Promise<void> => {
    const response = await request(`actions/jobs/${String(id)}`, conditions)

    if (response.status === HTTP_STATUS.OK) {
      const current = jobSchema.parse(await response.json())
      const state = jobState(current, step)

      if (state === JOB_STATE.READY) {
        const waited = Math.round((Date.now() - started) / MILLISECONDS_PER_SECOND)
        process.stdout.write(`"${current.name}" finished its step "${step}" after ${String(waited)} s of waiting.\n`)

        return
      }

      if (state === JOB_STATE.FAILED) {
        fail(failureReport(current, step))
      }

      const etag = response.headers.get(ETAG_HEADER)
      await pause()

      return waitFor(id, etag === null ? {} : { "if-none-match": etag })
    }

    if (response.type !== NETWORK_ERROR && response.status !== HTTP_STATUS.NOT_MODIFIED) {
      process.stdout.write(`::warning::GitHub's API answered ${String(response.status)} for "${job}".\n`)
    }

    await pause()

    return waitFor(id, conditions)
  }

  await waitFor(await findJob(), {})
}
