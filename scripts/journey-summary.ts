import { existsSync, readFileSync } from "node:fs"
import process from "node:process"
import { stripVTControlCharacters } from "node:util"
import * as zod from "zod"

import { MILLISECONDS_PER_SECOND } from "~/src/lib/duration"

import { scriptArguments } from "./run-command.ts"

const ERROR_LINES = 20

export const TEST_OUTCOME = { EXPECTED: "expected", FLAKY: "flaky", SKIPPED: "skipped", UNEXPECTED: "unexpected" } as const

const OUTCOME_LABEL: Readonly<Record<string, string>> = {
  [TEST_OUTCOME.EXPECTED]: "passed",
  [TEST_OUTCOME.FLAKY]: "flaky",
  [TEST_OUTCOME.SKIPPED]: "skipped",
  [TEST_OUTCOME.UNEXPECTED]: "failed",
}

export const SUMMARY_TITLE = "## Journey on preview"

const errorSchema = zod.object({ message: zod.string().default("") })
const resultSchema = zod.object({ duration: zod.number(), error: errorSchema.optional() })
const testSchema = zod.object({ results: zod.array(resultSchema), status: zod.string() })
const specSchema = zod.object({ tests: zod.array(testSchema), title: zod.string() })

interface Suite {
  readonly specs: zod.infer<typeof specSchema>[]
  readonly suites: Suite[]
}

const suiteSchema: zod.ZodType<Suite> = zod.object({
  specs: zod.array(specSchema).default([]),
  get suites() {
    return zod.array(suiteSchema).default([])
  },
})

const reportSchema = zod.object({
  errors: zod.array(errorSchema).default([]),
  stats: zod.object({ duration: zod.number(), expected: zod.int(), flaky: zod.int(), skipped: zod.int(), unexpected: zod.int() }),
  suites: zod.array(suiteSchema),
})

const argumentsSchema = zod.tuple([zod.string().min(1)])

interface Row {
  readonly duration: number
  readonly error: string
  readonly outcome: string
  readonly title: string
}

const seconds = (milliseconds: number): string => `${String(Math.round(milliseconds / MILLISECONDS_PER_SECOND))} s`

const errorText = (message: string): string => stripVTControlCharacters(message).trim().split("\n").slice(0, ERROR_LINES).join("\n")

const rowsOf = (suite: Suite): Row[] => [
  ...suite.specs.flatMap(({ tests, title }) =>
    tests.map(({ results, status }) => ({
      duration: results.reduce((total, result) => total + result.duration, 0),
      error: errorText(results.map((result) => result.error?.message ?? "").join("\n")),
      outcome: OUTCOME_LABEL[status] ?? status,
      title,
    })),
  ),
  ...suite.suites.flatMap((child) => rowsOf(child)),
]

const failureBlock = ({ error, title }: { error: string; title: string }): string => `### ${title}\n\n\`\`\`text\n${error}\n\`\`\``

export const journeySummary = (report: unknown): string => {
  const { errors, stats, suites } = reportSchema.parse(report)
  const rows = suites.flatMap((suite) => rowsOf(suite))
  const counts = `${String(stats.expected)} passed, ${String(stats.unexpected)} failed, ${String(stats.flaky)} flaky, ${String(stats.skipped)} skipped in ${seconds(stats.duration)}.`
  const table = [
    "| Test | Result | Duration |",
    "| --- | --- | --- |",
    ...rows.map((row) => `| ${row.title} | ${row.outcome} | ${seconds(row.duration)} |`),
  ]
  const failures = rows.filter((row) => row.error !== "").map((row) => failureBlock(row))
  const runErrors = errors.map(({ message }) => failureBlock({ error: errorText(message), title: "Run error" }))

  return [SUMMARY_TITLE, counts, ...(rows.length > 0 ? [table.join("\n")] : []), ...failures, ...runErrors].join("\n\n")
}

export const missingReport = (path: string): string => `${SUMMARY_TITLE}\n\nThe journey wrote no report to ${path}; its log says why.`

if (import.meta.main) {
  const [path] = argumentsSchema.parse(scriptArguments())
  const summary = existsSync(path) ? journeySummary(JSON.parse(readFileSync(path, "utf8"))) : missingReport(path)

  process.stdout.write(`${summary}\n`)
}
