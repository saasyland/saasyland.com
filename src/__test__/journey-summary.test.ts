import { describe, expect, it } from "vite-plus/test"

import { SUMMARY_TITLE, TEST_OUTCOME, journeySummary, missingReport } from "~/scripts/journey-summary"

const CORE = "Core: pays in the Polar sandbox"
const UPGRADE = "Core to Complete: pays the difference in the Polar sandbox"
const STATS = { duration: 125_400, expected: 1, flaky: 0, skipped: 0, unexpected: 1 }
const COLOURED_ERROR = "\u001B[31mError: Resend did not return the email\u001B[39m\n    at inbox.ts:40"

const passed = { results: [{ duration: 61_200 }], status: TEST_OUTCOME.EXPECTED }
const failed = { results: [{ duration: 64_100, error: { message: COLOURED_ERROR } }], status: TEST_OUTCOME.UNEXPECTED }

describe("journeySummary", () => {
  it("counts the outcomes and lists each test with its result and duration, from nested suites too", () => {
    const summary = journeySummary({
      stats: STATS,
      suites: [{ specs: [{ tests: [passed], title: CORE }], suites: [{ specs: [{ tests: [failed], title: UPGRADE }] }] }],
    })

    expect(summary).toContain(`${SUMMARY_TITLE}\n\n1 passed, 1 failed, 0 flaky, 0 skipped in 125 s.`)
    expect(summary).toContain(`| ${CORE} | passed | 61 s |`)
    expect(summary).toContain(`| ${UPGRADE} | failed | 64 s |`)
  })

  it("prints the error of each failed test without its terminal colours", () => {
    const summary = journeySummary({ stats: STATS, suites: [{ specs: [{ tests: [failed], title: UPGRADE }] }] })

    expect(summary).toContain(`### ${UPGRADE}\n\n\`\`\`text\nError: Resend did not return the email\n    at inbox.ts:40\n\`\`\``)
    expect(summary).not.toContain("\u001B[")
  })

  it("prints the errors that stopped the run before any test, such as missing settings", () => {
    const summary = journeySummary({
      errors: [{ message: "Error: Set POLAR_ACCESS_TOKEN in .env.preview or the environment to run the journey." }],
      stats: { ...STATS, expected: 0, unexpected: 0 },
      suites: [],
    })

    expect(summary).toContain("### Run error\n\n```text\nError: Set POLAR_ACCESS_TOKEN")
    expect(summary).not.toContain("| Test |")
  })
})

describe("missingReport", () => {
  it("says that the run wrote no report", () => {
    expect(missingReport("playwright-report/journey.json")).toBe(
      `${SUMMARY_TITLE}\n\nThe journey wrote no report to playwright-report/journey.json; its log says why.`,
    )
  })
})
