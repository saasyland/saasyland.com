import { describe, expect, it } from "vite-plus/test"

import {
  type Artifact,
  JOB_CONCLUSION,
  JOB_STATE,
  JOB_STATUS,
  type Job,
  WAIT_LIMIT_MINUTES,
  digestOf,
  digestReport,
  downloadTimeoutReport,
  failureReport,
  isNamed,
  jobState,
  listingTimeoutReport,
  matchesDigest,
  timeoutReport,
  uploadedArtifact,
} from "~/scripts/download-artifact"

const BUILD = "Build the test Worker (chromium)"
const UPLOAD = "Upload the test build"
const URL = "https://github.com/saasyland/saasyland.com/actions/runs/1/job/2"
const ARTIFACT = "test-worker-chromium"
const BUILD_STARTED = "2026-11-22T16:10:30Z"
const BEFORE_BUILD = "2026-11-22T15:40:12Z"
const AFTER_BUILD = "2026-11-22T16:13:58Z"
const LATER_UPLOAD = "2026-11-22T16:21:48Z"
const ARCHIVE = new TextEncoder().encode("test")
const ARCHIVE_DIGEST = "sha256:9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
const OTHER_DIGEST = "sha256:2013bb77dc4f3b0fe74577cb91c4f2b44dd26f3b49f1dbcc72e1379500934c46"

const job = (overrides: Partial<Job>): Job => ({
  conclusion: null,
  html_url: URL,
  id: 2,
  name: `Build and E2E / ${BUILD}`,
  started_at: BUILD_STARTED,
  status: JOB_STATUS.IN_PROGRESS,
  steps: [],
  ...overrides,
})

const artifact = (overrides: Partial<Artifact>): Artifact => ({
  created_at: AFTER_BUILD,
  digest: ARCHIVE_DIGEST,
  expired: false,
  id: 7,
  name: ARTIFACT,
  ...overrides,
})

const BUILT = { conclusion: JOB_CONCLUSION.SUCCESS, name: "Build local Cloudflare test environment" }
const BUILD_FAILED = { conclusion: JOB_CONCLUSION.FAILURE, name: "Build local Cloudflare test environment" }
const UPLOADING = { conclusion: null, name: UPLOAD }
const UPLOADED = { conclusion: JOB_CONCLUSION.SUCCESS, name: UPLOAD }

describe("isNamed", () => {
  it("finds the job by its own name, alone or under the names of the workflows that call it", () => {
    expect(isNamed(BUILD)({ name: BUILD })).toBe(true)
    expect(isNamed(BUILD)({ name: `Build and E2E / ${BUILD}` })).toBe(true)
    expect(isNamed(BUILD)({ name: `Checks / Build and E2E / ${BUILD}` })).toBe(true)
  })

  it("does not take the job of another browser or a job whose name only ends the same way", () => {
    expect(isNamed(BUILD)({ name: "E2E (webkit) / Build the test Worker (webkit)" })).toBe(false)
    expect(isNamed(BUILD)({ name: `Rebuild ${BUILD}` })).toBe(false)
  })
})

describe("jobState", () => {
  it("is ready once the step has succeeded, before the job's own clean-up ends", () => {
    expect(jobState(job({ steps: [BUILT, UPLOADED] }), UPLOAD)).toBe(JOB_STATE.READY)
  })

  it("waits while the job is queued or its steps are still running", () => {
    expect(jobState(job({ status: JOB_STATUS.QUEUED }), UPLOAD)).toBe(JOB_STATE.PENDING)
    expect(jobState(job({ steps: [BUILT, UPLOADING] }), UPLOAD)).toBe(JOB_STATE.PENDING)
  })

  it("fails as soon as a step fails, without waiting for the job to finish", () => {
    expect(jobState(job({ steps: [BUILD_FAILED] }), UPLOAD)).toBe(JOB_STATE.FAILED)
  })

  it("fails when the job finished without the step succeeding, cancelled or not", () => {
    expect(jobState(job({ conclusion: JOB_CONCLUSION.CANCELLED, status: JOB_STATUS.COMPLETED, steps: [BUILT] }), UPLOAD)).toBe(
      JOB_STATE.FAILED,
    )
    expect(jobState(job({ conclusion: JOB_CONCLUSION.SUCCESS, status: JOB_STATUS.COMPLETED }), UPLOAD)).toBe(JOB_STATE.FAILED)
  })
})

describe("uploadedArtifact", () => {
  it("takes the artifact once GitHub lists it", () => {
    expect(uploadedArtifact([artifact({})], ARTIFACT, BUILD_STARTED)).toStrictEqual(artifact({}))
  })

  it("keeps waiting while GitHub does not list the artifact yet", () => {
    expect(uploadedArtifact([], ARTIFACT, BUILD_STARTED)).toBeUndefined()
    expect(uploadedArtifact([artifact({ name: "test-worker-webkit" })], ARTIFACT, BUILD_STARTED)).toBeUndefined()
  })

  it("ignores an artifact an earlier attempt of the build uploaded, expired or without an upload time", () => {
    expect(uploadedArtifact([artifact({ created_at: BEFORE_BUILD })], ARTIFACT, BUILD_STARTED)).toBeUndefined()
    expect(uploadedArtifact([artifact({ expired: true })], ARTIFACT, BUILD_STARTED)).toBeUndefined()
    expect(uploadedArtifact([artifact({ created_at: null })], ARTIFACT, BUILD_STARTED)).toBeUndefined()
  })

  it("takes the newest upload when the build uploaded more than once, whatever order GitHub gave their IDs in", () => {
    const first = artifact({ id: 14_764_800_600 })
    const second = artifact({ created_at: LATER_UPLOAD, id: 14_763_949_072 })

    expect(uploadedArtifact([first, second], ARTIFACT, BUILD_STARTED)).toStrictEqual(second)
    expect(uploadedArtifact([second, first], ARTIFACT, BUILD_STARTED)).toStrictEqual(second)
  })
})

describe("failureReport", () => {
  it("names the step that failed and links the job", () => {
    expect(failureReport(job({ steps: [BUILD_FAILED] }), UPLOAD)).toBe(
      `"Build and E2E / ${BUILD}" failed in its step "${BUILD_FAILED.name}", so its step "${UPLOAD}" will not run: ${URL}`,
    )
  })

  it("names the job's conclusion when no step failed", () => {
    expect(failureReport(job({ conclusion: JOB_CONCLUSION.CANCELLED, status: JOB_STATUS.COMPLETED }), UPLOAD)).toBe(
      `"Build and E2E / ${BUILD}" finished with ${JOB_CONCLUSION.CANCELLED} before its step "${UPLOAD}" succeeded: ${URL}`,
    )
  })
})

describe("timeoutReport", () => {
  it("says how long the shard waited for the step", () => {
    expect(timeoutReport({ job: BUILD, step: UPLOAD })).toBe(
      `"${BUILD}" did not finish its step "${UPLOAD}" within ${String(WAIT_LIMIT_MINUTES)} minutes.`,
    )
  })
})

describe("matchesDigest", () => {
  it("names the archive by the SHA-256 of its bytes, the way GitHub records an upload", () => {
    expect(digestOf(ARCHIVE)).toBe(ARCHIVE_DIGEST)
  })

  it("accepts the archive whose bytes match the digest GitHub recorded, or an upload GitHub recorded none for", () => {
    expect(matchesDigest(artifact({}), ARCHIVE)).toBe(true)
    expect(matchesDigest(artifact({ digest: null }), ARCHIVE)).toBe(true)
  })

  it("rejects an archive that arrived cut short or changed", () => {
    expect(matchesDigest(artifact({ digest: OTHER_DIGEST }), ARCHIVE)).toBe(false)
  })
})

describe("digestReport", () => {
  it("names both digests", () => {
    expect(digestReport(artifact({ digest: OTHER_DIGEST }), ARCHIVE)).toBe(
      `The artifact "${ARTIFACT}" arrived with the digest ${ARCHIVE_DIGEST} instead of ${OTHER_DIGEST}.`,
    )
  })
})

describe("listingTimeoutReport", () => {
  it("says the step finished but the artifact was never listed", () => {
    expect(listingTimeoutReport({ artifact: ARTIFACT, job: BUILD, step: UPLOAD })).toBe(
      `"${BUILD}" finished its step "${UPLOAD}", but GitHub did not list the artifact "${ARTIFACT}" within ${String(WAIT_LIMIT_MINUTES)} minutes.`,
    )
  })
})

describe("downloadTimeoutReport", () => {
  it("says the artifact was listed but never served whole", () => {
    expect(downloadTimeoutReport({ artifact: ARTIFACT })).toBe(
      `GitHub listed the artifact "${ARTIFACT}" but did not serve it whole within ${String(WAIT_LIMIT_MINUTES)} minutes.`,
    )
  })
})
