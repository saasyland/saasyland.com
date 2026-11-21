import { describe, expect, it } from "vite-plus/test"

import { CHECK_CONCLUSION, RULE_TYPE, isTested, requiredChecksOf, testedReport, untestedChecks } from "~/scripts/tested-commit"

const VERIFY = "Format, lint, types, i18n, tests"
const E2E = "Build and E2E / Build and E2E (chromium)"
const UPLOAD = "Worker upload / Upload preview"
const REQUIRED = [VERIFY, E2E, UPLOAD]

const RULES = [
  { type: "deletion" },
  { parameters: { merge_method: "SQUASH" }, type: "merge_queue" },
  {
    parameters: {
      required_status_checks: REQUIRED.map((context) => ({ context, integration_id: 15_368 })),
      strict_required_status_checks_policy: false,
    },
    type: RULE_TYPE.REQUIRED_STATUS_CHECKS,
  },
]

const passedAll = REQUIRED.map((name) => ({ conclusion: CHECK_CONCLUSION.SUCCESS, name }))

describe("requiredChecksOf", () => {
  it("reads the status checks the branch rules require and skips every other rule", () => {
    expect(requiredChecksOf(RULES)).toStrictEqual(REQUIRED)
  })

  it("finds no required check in rules that have none", () => {
    expect(requiredChecksOf([{ type: "deletion" }])).toStrictEqual([])
  })
})

describe("isTested", () => {
  it("counts a commit as tested when every required check passed on it, whatever else ran", () => {
    const checkRuns = [...passedAll, { conclusion: CHECK_CONCLUSION.FAILURE, name: "Analyze (actions)" }]

    expect(isTested({ checkRuns, required: REQUIRED })).toBe(true)
    expect(untestedChecks({ checkRuns, required: REQUIRED })).toStrictEqual([])
  })

  it.each([
    { checkRuns: passedAll.filter(({ name }) => name !== E2E), state: "has not run" },
    { checkRuns: [...passedAll.filter(({ name }) => name !== E2E), { conclusion: null, name: E2E }], state: "is still running" },
    {
      checkRuns: [...passedAll.filter(({ name }) => name !== E2E), { conclusion: CHECK_CONCLUSION.SKIPPED, name: E2E }],
      state: "was skipped",
    },
    {
      checkRuns: [...passedAll.filter(({ name }) => name !== E2E), { conclusion: CHECK_CONCLUSION.FAILURE, name: E2E }],
      state: "failed",
    },
  ])("does not count a commit as tested when a required check $state", ({ checkRuns }) => {
    expect(isTested({ checkRuns, required: REQUIRED })).toBe(false)
    expect(untestedChecks({ checkRuns, required: REQUIRED })).toStrictEqual([E2E])
  })

  it("counts no commit as tested when the rules require no check", () => {
    expect(isTested({ checkRuns: passedAll, required: [] })).toBe(false)
  })
})

describe("testedReport", () => {
  it("names the checks a tested commit passed", () => {
    expect(testedReport({ checkRuns: passedAll, required: REQUIRED })).toBe(
      `The commit passed every check that main requires: ${REQUIRED.join(", ")}.`,
    )
  })

  it("names the required checks a commit has not passed", () => {
    expect(testedReport({ checkRuns: [], required: [VERIFY, E2E] })).toBe(
      `The commit has not passed ${VERIFY}, ${E2E}, which main requires.`,
    )
  })

  it("explains why no commit counts as tested without required checks", () => {
    expect(testedReport({ checkRuns: passedAll, required: [] })).toBe(
      "The rules of main require no status check, so no commit counts as tested.",
    )
  })
})
