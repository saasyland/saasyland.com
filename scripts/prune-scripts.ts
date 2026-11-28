import { posix } from "node:path"
import * as zod from "zod"

export const PACKAGE_FILE = "package.json"

const STEP_SEPARATOR = " && "
const STEPS = /\s*&&\s*/u
const WORDS = /\s+/u
const OTHER_OPERATOR = /\|\||[|;&]/u
const ASSIGNMENT = /^[^=]*=/u
const PACKAGE_MANAGER = "bun"
const RUN = "run"
const FLAG = "-"
const JSON_INDENT = 2

const manifestSchema = zod.record(zod.string(), zod.unknown())
const scriptsSchema = zod.record(zod.string(), zod.string()).default({})

export interface ScriptReferences {
  readonly files: readonly string[]
  readonly runs: readonly string[]
}

export interface ScriptProblem {
  readonly name: string
  readonly reason: string
}

export interface ScriptsPrune {
  readonly deleted: ReadonlySet<string>
  readonly directory: string
  readonly source: string
}

export interface PrunedScripts {
  readonly problems: readonly ScriptProblem[]
  readonly source: string
}

interface ScriptSteps {
  readonly kept: readonly string[]
  readonly name: string
  readonly steps: number
  readonly stuck: readonly string[]
}

export const scriptsOf = (source: string): Record<string, string> =>
  scriptsSchema.parse(manifestSchema.parse(JSON.parse(source))["scripts"])

export const stepsOf = (command: string): string[] => command.split(STEPS)

const scriptRun = (words: readonly string[]): string[] => {
  const [runner, command, script] = words.filter((word) => !word.startsWith(FLAG))

  return runner === PACKAGE_MANAGER && command === RUN && script !== undefined ? [script] : []
}

export const referencesOf = (step: string, directory: string): ScriptReferences => {
  const words = step.trim().split(WORDS)

  return { files: words.map((word) => posix.join(directory, word.replace(ASSIGNMENT, ""))), runs: scriptRun(words) }
}

const stuckReason = (step: string): string =>
  `\`${step}\` names what the removed features take away, and it shares its command with another through an operator other than \`&&\`, so it cannot go alone`

const settle = (
  scripts: Readonly<Record<string, string>>,
  { deleted, directory }: Omit<ScriptsPrune, "source">,
  removed: ReadonlySet<string>,
): ScriptSteps[] => {
  const isGone = (step: string): boolean => {
    const { files, runs } = referencesOf(step, directory)

    return files.some((file) => deleted.has(file)) || runs.some((script) => removed.has(script))
  }
  const results = Object.entries(scripts).map(([name, command]): ScriptSteps => {
    const steps = stepsOf(command)
    const stuck = steps.filter((step) => isGone(step) && OTHER_OPERATOR.test(step))

    return { kept: steps.filter((step) => !isGone(step) || stuck.includes(step)), name, steps: steps.length, stuck }
  })
  const emptied = results.filter(({ kept }) => kept.length === 0).map(({ name }) => name)

  return emptied.length > removed.size ? settle(scripts, { deleted, directory }, new Set(emptied)) : results
}

export const pruneScripts = ({ deleted, directory, source }: ScriptsPrune): PrunedScripts => {
  const manifest = manifestSchema.parse(JSON.parse(source))
  const results = settle(scriptsOf(source), { deleted, directory }, new Set())
  const scripts = Object.fromEntries(
    results.filter(({ kept }) => kept.length > 0).map(({ kept, name }) => [name, kept.join(STEP_SEPARATOR)]),
  )
  const changed = results.some(({ kept, steps }) => kept.length < steps)

  return {
    problems: results.flatMap(({ name, stuck }) => stuck.map((step) => ({ name, reason: stuckReason(step) }))),
    source: changed ? `${JSON.stringify({ ...manifest, scripts }, undefined, JSON_INDENT)}\n` : source,
  }
}
