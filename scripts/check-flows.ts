import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import process from "node:process"
import * as zod from "zod"

import * as AREA_FLOWS from "../e2e/data/flows.entries.ts"
import { FLOW_STATUS, type Flow, type FlowTest } from "../e2e/data/flows.ts"
import { FAILURE_EXIT_CODE } from "./run-command.ts"

const PULL_REQUEST_PROJECT = "chromium"
const JOURNEY_SPEC = "e2e/journey/journey.spec.ts"

export const TITLE_SEPARATOR = " › "

export const EXPECTED_STATUS = {
  FAILED: "failed",
  INTERRUPTED: "interrupted",
  PASSED: "passed",
  SKIPPED: "skipped",
  TIMED_OUT: "timedOut",
} as const

export const FLOWS: readonly Flow[] = Object.values(AREA_FLOWS).flat()

const listedTestSchema = zod.object({ expectedStatus: zod.enum(EXPECTED_STATUS) })

const listedSpecSchema = zod.object({ file: zod.string(), tests: zod.array(listedTestSchema), title: zod.string() })

const listedSuiteSchema = zod.object({
  specs: zod.array(listedSpecSchema),
  get suites() {
    return zod.array(listedSuiteSchema).optional()
  },
  title: zod.string(),
})

const listingErrorSchema = zod.object({ message: zod.string() })

const listingSchema = zod.object({ errors: zod.array(listingErrorSchema), suites: zod.array(listedSuiteSchema) })

type ListedSuite = zod.infer<typeof listedSuiteSchema>

export interface BrowserTest extends FlowTest {
  readonly skipped: boolean
}

interface FlowCheck {
  readonly flows: readonly Flow[]
  readonly journey: string
  readonly tests: readonly BrowserTest[]
}

const testsOf = (suite: ListedSuite, path: readonly string[]): BrowserTest[] => [
  ...suite.specs.map(({ file, tests, title }) => ({
    skipped: tests.every(({ expectedStatus }) => expectedStatus === EXPECTED_STATUS.SKIPPED),
    spec: file,
    title: [...path, title].join(TITLE_SEPARATOR),
  })),
  ...(suite.suites ?? []).flatMap((child) => testsOf(child, [...path, child.title])),
]

export const parseBrowserTests = (json: string): BrowserTest[] => {
  const { errors, suites } = listingSchema.parse(JSON.parse(json))

  if (errors.length > 0) {
    throw new Error(`Playwright could not list the browser suite: ${errors.map(({ message }) => message).join("; ")}`)
  }

  return suites.flatMap((suite) => testsOf(suite, []))
}

export const listBrowserTests = (): BrowserTest[] => {
  const { stdout } = spawnSync("vp", ["exec", "playwright", "test", "--list", "--reporter=json", `--project=${PULL_REQUEST_PROJECT}`], {
    encoding: "utf8",
  })

  return parseBrowserTests(stdout)
}

export const testLabel = ({ spec, title }: FlowTest): string => `${spec}${TITLE_SEPARATOR}${title}`

const testProblems = (id: string, references: readonly FlowTest[], listed: ReadonlyMap<string, BrowserTest>): string[] =>
  references.flatMap((reference) => {
    const test = listed.get(testLabel(reference))

    if (test === undefined) {
      return [`${id}: ${reference.spec} has no test "${reference.title}"`]
    }

    return test.skipped ? [`${id}: "${reference.title}" in ${reference.spec} is skipped`] : []
  })

const referencesOf = (flow: Flow): readonly FlowTest[] => ("tests" in flow ? flow.tests : [])

const reasonProblems = (flow: Flow): string[] => {
  if (flow.status === FLOW_STATUS.COVERED || flow.reason.trim().length > 0) {
    return []
  }

  return [`${flow.id}: a ${flow.status} flow says why in its reason`]
}

const journeyProblems = (flow: Flow, journey: string): string[] => {
  if (!("journey" in flow) || journey.includes(`test.step(${JSON.stringify(flow.journey)}`)) {
    return []
  }

  return [`${flow.id}: ${JOURNEY_SPEC} has no step "${flow.journey}"`]
}

export const flowProblems = ({ flows, journey, tests }: FlowCheck): string[] => {
  const listed = new Map(tests.map((test) => [testLabel(test), test]))
  const ids = flows.map(({ id }) => id)
  const repeated = new Set(ids.filter((id, index) => ids.indexOf(id) !== index))

  return [
    ...[...repeated].map((id) => `${id}: more than one flow has this id`),
    ...flows.flatMap((flow) => [
      ...testProblems(flow.id, referencesOf(flow), listed),
      ...reasonProblems(flow),
      ...journeyProblems(flow, journey),
    ]),
  ]
}

export const readJourney = (): string => readFileSync(JOURNEY_SPEC, "utf8")

if (import.meta.main) {
  const problems = flowProblems({ flows: FLOWS, journey: readJourney(), tests: listBrowserTests() })

  if (problems.length > 0) {
    console.error(problems.join("\n"))
    process.exit(FAILURE_EXIT_CODE)
  }
}
