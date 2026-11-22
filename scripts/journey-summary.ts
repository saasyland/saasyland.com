import { existsSync, readFileSync } from "node:fs"
import process from "node:process"
import { stripVTControlCharacters } from "node:util"
import { z } from "zod/v4"

import { MILLISECONDS_PER_SECOND } from "~/src/lib/duration"

const SCRIPT_ARGUMENTS_START = 2
const ERROR_LINES = 20

export const TEST_OUTCOME = { EXPECTED: "expected", FLAKY: "flaky", SKIPPED: "skipped", UNEXPECTED: "unexpected" } as const

const OUTCOME_LABEL: Readonly<Record<string, string>> = {
  [TEST_OUTCOME.EXPECTED]: "passed",
  [TEST_OUTCOME.FLAKY]: "flaky",
  [TEST_OUTCOME.SKIPPED]: "skipped",
  [TEST_OUTCOME.UNEXPECTED]: "failed",
}

export const SUMMARY_TITLE = "## Journey on preview"

const errorSchema = z.object({ message: z.string().default("") })
const resultSchema = z.object({ duration: z.number(), error: errorSchema.optional() })
const testSchema = z.object({ results: z.array(resultSchema), status: z.string() })
const specSchema = z.object({ tests: z.array(testSchema), title: z.string() })

interface Suite {
  readonly specs: z.infer<typeof specSchema>[]
  readonly suites: Suite[]
}

const suiteSchema: z.ZodType<Suite> = z.object({
  specs: z.array(specSchema).default([]),
  get suites() {
    return z.array(suiteSchema).default([])
  },
})

const reportSchema = z.object({
  errors: z.array(errorSchema).default([]),
  stats: z.object({ duration: z.number(), expected: z.int(), flaky: z.int(), skipped: z.int(), unexpected: z.int() }),
  suites: z.array(suiteSchema),
})

const argumentsSchema = z.tuple([z.string().min(1)])

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
  const [path] = argumentsSchema.parse(process.argv.slice(SCRIPT_ARGUMENTS_START))
  const summary = existsSync(path) ? journeySummary(JSON.parse(readFileSync(path, "utf8"))) : missingReport(path)

  process.stdout.write(`${summary}\n`)
}
