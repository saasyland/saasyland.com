import { describe, expect, it } from "vite-plus/test"

import {
  JOB_CONCLUSION,
  JOB_STATE,
  JOB_STATUS,
  type Job,
  WAIT_LIMIT_MINUTES,
  failureReport,
  isNamed,
  jobState,
  timeoutReport,
} from "~/scripts/wait-for-job"

const BUILD = "Build the test Worker (chromium)"
const UPLOAD = "Upload the test build"
const URL = "https://github.com/saasyland/saasyland.com/actions/runs/1/job/2"

const job = (overrides: Partial<Job>): Job => ({
  conclusion: null,
  html_url: URL,
  id: 2,
  name: `Build and E2E / ${BUILD}`,
  status: JOB_STATUS.IN_PROGRESS,
  steps: [],
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
