import { describe, expect, it } from "vite-plus/test"

import { FLOW_FEATURE, FLOW_STATUS, type Flow } from "~/e2e/data/flows"
import { EXPECTED_STATUS, FLOWS, flowProblems, parseBrowserTests, readJourney } from "~/scripts/check-flows"

const SPEC = "account.spec.ts"
const SIGN_UP = "account › signs up"
const JOURNEY = 'await test.step("pay with the test card", async () => {})'

const listing = (errors: readonly { message: string }[] = []) =>
  JSON.stringify({
    errors,
    suites: [
      {
        specs: [{ file: SPEC, tests: [{ expectedStatus: EXPECTED_STATUS.PASSED }], title: "signs in" }],
        suites: [
          {
            specs: [
              { file: SPEC, tests: [{ expectedStatus: EXPECTED_STATUS.PASSED }], title: "signs up" },
              { file: SPEC, tests: [{ expectedStatus: EXPECTED_STATUS.SKIPPED }], title: "signs out" },
            ],
            title: "account",
          },
        ],
        title: SPEC,
      },
    ],
  })

const covered = (title: string): Flow => ({
  feature: FLOW_FEATURE.ACCOUNT,
  id: "sign-up",
  outcome: "A visitor signs up",
  status: FLOW_STATUS.COVERED,
  tests: [{ spec: SPEC, title }],
})

const problemsOf = (flows: readonly Flow[]): string[] => flowProblems({ flows, journey: JOURNEY, tests: parseBrowserTests(listing()) })

describe("parseBrowserTests", () => {
  it("names each test by its describe blocks and its own title, in the file Playwright lists it in", () => {
    expect(parseBrowserTests(listing())).toStrictEqual([
      { skipped: false, spec: SPEC, title: "signs in" },
      { skipped: false, spec: SPEC, title: SIGN_UP },
      { skipped: true, spec: SPEC, title: "account › signs out" },
    ])
  })

  it("refuses a listing in which Playwright could not load a spec", () => {
    expect(() => parseBrowserTests(listing([{ message: "SyntaxError in account.spec.ts" }]))).toThrow("SyntaxError in account.spec.ts")
  })
})

describe("flowProblems", () => {
  it("accepts a flow whose test the browser suite runs", () => {
    expect(problemsOf([covered(SIGN_UP)])).toStrictEqual([])
  })

  it("names a flow whose test was renamed or deleted", () => {
    expect(problemsOf([covered("account › registers")])).toStrictEqual([`sign-up: ${SPEC} has no test "account › registers"`])
  })

  it("names a flow whose test is skipped", () => {
    expect(problemsOf([covered("account › signs out")])).toStrictEqual([`sign-up: "account › signs out" in ${SPEC} is skipped`])
  })

  it("names an id that two flows share", () => {
    expect(problemsOf([covered(SIGN_UP), covered(SIGN_UP)])).toStrictEqual(["sign-up: more than one flow has this id"])
  })

  it("names a missing flow or a flow to build that does not say why", () => {
    const flows: Flow[] = [
      { feature: FLOW_FEATURE.ACCOUNT, id: "reset", outcome: "A user resets the password", reason: " ", status: FLOW_STATUS.MISSING },
      { feature: FLOW_FEATURE.ACCOUNT, id: "delete", outcome: "A user deletes the account", reason: "", status: FLOW_STATUS.TO_BUILD },
    ]

    expect(problemsOf(flows)).toStrictEqual([
      `reset: a ${FLOW_STATUS.MISSING} flow says why in its reason`,
      `delete: a ${FLOW_STATUS.TO_BUILD} flow says why in its reason`,
    ])
  })

  it("checks the partial tests of a missing flow and the journey step it names", () => {
    const flow: Flow = {
      feature: FLOW_FEATURE.PURCHASE,
      id: "buy",
      journey: "pay with the test card",
      outcome: "A buyer pays",
      reason: "Only the journey pays.",
      status: FLOW_STATUS.MISSING,
      tests: [{ spec: SPEC, title: SIGN_UP }],
    }

    expect(problemsOf([flow])).toStrictEqual([])
    expect(problemsOf([{ ...flow, journey: "pay with cash", tests: [{ spec: SPEC, title: "pays" }] }])).toStrictEqual([
      `buy: ${SPEC} has no test "pays"`,
      'buy: e2e/journey/journey.spec.ts has no step "pay with cash"',
    ])
  })
})

describe("the flow inventory", () => {
  it("names only steps the journey suite has", () => {
    const journey = readJourney()

    expect(
      FLOWS.flatMap((flow) => ("journey" in flow ? [flow.journey] : [])).filter((step) => !journey.includes(`"${step}"`)),
    ).toStrictEqual([])
  })
})
