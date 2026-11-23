import { execFileSync } from "node:child_process"
import process from "node:process"
import { z } from "zod/v4"

import { MAIN_BRANCH } from "~/src/lib/changelog"

import { scriptArguments } from "./run-command.ts"

export const RULE_TYPE = { REQUIRED_STATUS_CHECKS: "required_status_checks" } as const

export const CHECK_CONCLUSION = { FAILURE: "failure", SKIPPED: "skipped", SUCCESS: "success" } as const

const requiredCheckSchema = z.object({ context: z.string() })
const checkRunSchema = z.object({ conclusion: z.string().nullable(), name: z.string() })

const argumentsSchema = z.tuple([z.string().regex(/^[\da-f]{40,64}$/u)])
const environmentSchema = z.object({ GITHUB_REPOSITORY: z.string().min(1) })
const rulesSchema = z.array(z.looseObject({ type: z.string() }))
const statusChecksRuleSchema = z.object({
  parameters: z.object({ required_status_checks: z.array(requiredCheckSchema) }),
  type: z.literal(RULE_TYPE.REQUIRED_STATUS_CHECKS),
})
const checkRunsSchema = z.object({ check_runs: z.array(checkRunSchema) })

export type CheckRun = z.infer<typeof checkRunSchema>

interface CommitChecks {
  readonly checkRuns: readonly CheckRun[]
  readonly required: readonly string[]
}

const gh = (path: string): unknown => JSON.parse(execFileSync("gh", ["api", path], { encoding: "utf8" }))

const contextsOf = (rule: unknown): string[] => {
  const statusChecks = statusChecksRuleSchema.safeParse(rule)

  if (!statusChecks.success) {
    return []
  }

  return statusChecks.data.parameters.required_status_checks.map(({ context }) => context)
}

export const requiredChecksOf = (rules: unknown): string[] => rulesSchema.parse(rules).flatMap((rule) => contextsOf(rule))

const passed = (checkRuns: readonly CheckRun[], name: string): boolean =>
  checkRuns.some((run) => run.name === name && run.conclusion === CHECK_CONCLUSION.SUCCESS)

export const untestedChecks = ({ checkRuns, required }: CommitChecks): string[] => required.filter((name) => !passed(checkRuns, name))

export const isTested = ({ checkRuns, required }: CommitChecks): boolean =>
  required.length > 0 && untestedChecks({ checkRuns, required }).length === 0

export const testedReport = ({ checkRuns, required }: CommitChecks): string => {
  if (required.length === 0) {
    return `The rules of ${MAIN_BRANCH} require no status check, so no commit counts as tested.`
  }

  const untested = untestedChecks({ checkRuns, required })

  if (untested.length > 0) {
    return `The commit has not passed ${untested.join(", ")}, which ${MAIN_BRANCH} requires.`
  }

  return `The commit passed every check that ${MAIN_BRANCH} requires: ${required.join(", ")}.`
}

if (import.meta.main) {
  const [commit] = argumentsSchema.parse(scriptArguments())
  const { GITHUB_REPOSITORY } = environmentSchema.parse(process.env)
  const required = requiredChecksOf(gh(`repos/${GITHUB_REPOSITORY}/rules/branches/${MAIN_BRANCH}`))
  const { check_runs: checkRuns } = checkRunsSchema.parse(gh(`repos/${GITHUB_REPOSITORY}/commits/${commit}/check-runs?per_page=100`))

  process.stderr.write(`${testedReport({ checkRuns, required })}\n`)
  process.stdout.write(`tested=${String(isTested({ checkRuns, required }))}\n`)
}
