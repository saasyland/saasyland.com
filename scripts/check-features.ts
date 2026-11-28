import { spawnSync } from "node:child_process"
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, posix, resolve } from "node:path"
import process from "node:process"
import * as zod from "zod"

import { FEATURE, FEATURES, FEATURE_SCENARIO, FEATURE_SCENARIOS, type Feature, type FeatureScenario } from "./features.ts"
import { type PruneProblem, pruneProject } from "./prune-references.ts"
import { PACKAGE_FILE, type ScriptReferences, referencesOf, scriptsOf, stepsOf } from "./prune-scripts.ts"
import { FAILURE_EXIT_CODE, runCommand, scriptArguments } from "./run-command.ts"

const MESSAGES = "messages"
const MESSAGE_EXTENSION = ".json"
const GENERATED = ":(attr:linguist-generated)"
const DEPENDENCIES = "node_modules"
const BINARIES = ".bin"
const CORE_DERIVED = ["generate:cn"]
const ROUTE_TREE = "generate:routes"
const TYPE_CHECK = ["run", "tsc", "--noEmit"]
const FORMAT = ["x", "vp", "fmt"]
const TRANSLATION_CHECK = ["run", "check:i18n"]

const scenarioSchema = zod.enum(FEATURE_SCENARIO)

export interface FeatureRemoval {
  readonly kept: readonly string[]
  readonly problems: readonly PruneProblem[]
  readonly removed: readonly Feature[]
  readonly sources: ReadonlyMap<string, string>
}

export interface ProjectSource {
  readonly generated: ReadonlySet<string>
  readonly read: (file: string) => string
}

export interface ScriptTargets {
  readonly isBinary: (name: string) => boolean
  readonly isGone: (file: string) => boolean
}

export const removedFeatures = (features: readonly Feature[]): Feature[] => {
  const dependents = Object.values(FEATURE).filter(
    (feature) => !features.includes(feature) && FEATURES[feature].requires.some((required) => features.includes(required)),
  )

  return dependents.length > 0 ? removedFeatures([...features, ...dependents]) : features.toSorted()
}

export const isInFootprint = (file: string, features: readonly Feature[]): boolean =>
  features.some((feature) => FEATURES[feature].files.some((glob) => posix.matchesGlob(file, glob)))

export const removedNames = (features: readonly Feature[]): Map<string, string[]> =>
  new Map(
    [
      ...Map.groupBy(
        features.flatMap((feature) => Object.entries(FEATURES[feature].names ?? {})),
        ([file]) => file,
      ),
    ].map(([file, entries]) => [file, entries.flatMap(([, names]) => names)]),
  )

const namespacesOf = (files: readonly string[]): Set<string> =>
  new Set(
    files
      .filter((file) => posix.dirname(posix.dirname(file)) === MESSAGES && file.endsWith(MESSAGE_EXTENSION))
      .map((file) => posix.basename(file, MESSAGE_EXTENSION)),
  )

export const removedNamespaces = (deleted: readonly string[], kept: readonly string[]): Set<string> => {
  const keptNamespaces = namespacesOf(kept)

  return new Set([...namespacesOf(deleted)].filter((namespace) => !keptNamespaces.has(namespace)))
}

export const featureRemoval = (
  features: readonly Feature[],
  files: readonly string[],
  { generated, read }: ProjectSource,
): FeatureRemoval => {
  const removed = removedFeatures(features)
  const kept = files.filter((file) => !isInFootprint(file, removed))
  const deleted = files.filter((file) => isInFootprint(file, removed))
  const pruned = pruneProject({
    deleted: new Set(deleted),
    generated,
    kept,
    names: removedNames(removed),
    namespaces: removedNamespaces(deleted, kept),
    read,
  })

  return { kept: kept.filter((file) => !pruned.deleted.has(file)), problems: pruned.problems, removed, sources: pruned.sources }
}

export const problemLines = (problems: readonly PruneProblem[]): string[] =>
  problems.map(({ column, file, line, reason }) => `${file}:${String(line)}:${String(column)}: ${reason}`)

export const danglingScripts = (source: string, { isBinary, isGone }: ScriptTargets): string[] => {
  const scripts = scriptsOf(source)
  const steps = Object.entries(scripts).flatMap(([name, command]) =>
    stepsOf(command).map((step): [string, ScriptReferences] => [name, referencesOf(step, ".")]),
  )
  const files = steps.flatMap(([name, { files: named }]) =>
    named.filter((file) => isGone(file)).map((file) => `${PACKAGE_FILE}: \`${name}\` names ${file}, which the removed features delete`),
  )
  const runs = steps.flatMap(([name, { runs: run }]) =>
    run
      .filter((script) => !Object.hasOwn(scripts, script) && !isBinary(script))
      .map((script) => `${PACKAGE_FILE}: \`${name}\` runs \`${script}\`, which is neither one of its scripts nor an installed binary`),
  )

  return [...files, ...runs]
}

const gitFiles = (pathspecs: readonly string[]): string[] => {
  const { stdout } = spawnSync(
    "git",
    ["ls-files", "-z", "--cached", "--others", "--exclude-standard", "--deduplicate", "--", ...pathspecs],
    {
      encoding: "utf8",
    },
  )

  return stdout.split("\0").filter((file) => file.length > 0 && existsSync(file))
}

const copyProject = ({ kept, sources }: FeatureRemoval, root: string): void => {
  for (const file of kept) {
    mkdirSync(posix.dirname(join(root, file)), { recursive: true })
    cpSync(file, join(root, file))
  }

  for (const [file, source] of sources) {
    writeFileSync(join(root, file), source)
  }

  symlinkSync(resolve(DEPENDENCIES), join(root, DEPENDENCIES))
}

const derivedScripts = (removed: readonly Feature[]): string[] => [
  ...CORE_DERIVED,
  ...Object.values(FEATURE)
    .filter((feature) => !removed.includes(feature))
    .flatMap((feature) => FEATURES[feature].derive ?? []),
  ROUTE_TREE,
]

const siteChecks = (removal: FeatureRemoval, root: string): boolean =>
  derivedScripts(removal.removed).every((script) => runCommand("bun", ["run", script], { cwd: root }).status === 0) &&
  runCommand("bun", [...FORMAT, ...removal.sources.keys()], { cwd: root }).status === 0 &&
  runCommand("bun", TYPE_CHECK, { cwd: root }).status === 0 &&
  runCommand("bun", TRANSLATION_CHECK, { cwd: root }).status === 0

const checkScenario = (scenario: FeatureScenario, files: readonly string[], project: ProjectSource): boolean => {
  const removal = featureRemoval(FEATURE_SCENARIOS[scenario], files, project)
  const root = mkdtempSync(join(tmpdir(), `check-features-${scenario}-`))

  console.log(
    `check:features ${scenario}: without ${removal.removed.join(", ")}; ${String(files.length - removal.kept.length)} files deleted, ${String(removal.sources.size)} files pruned, ${String(removal.problems.length)} references left that cannot be pruned`,
  )

  const projectFiles = new Set(files)
  const kept = new Set(removal.kept)
  const dangling = danglingScripts(removal.sources.get(PACKAGE_FILE) ?? project.read(PACKAGE_FILE), {
    isBinary: (name) => existsSync(join(DEPENDENCIES, BINARIES, name)),
    isGone: (file) => projectFiles.has(file) && !kept.has(file),
  })

  if (removal.problems.length > 0 || dangling.length > 0) {
    console.error([...problemLines(removal.problems), ...dangling].join("\n"))
  }

  try {
    copyProject(removal, root)

    return siteChecks(removal, root) && removal.problems.length === 0 && dangling.length === 0
  } finally {
    rmSync(root, { force: true, recursive: true })
  }
}

if (import.meta.main) {
  const requested = scriptArguments().map((scenario) => scenarioSchema.parse(scenario))
  const files = gitFiles([])
  const project: ProjectSource = { generated: new Set(gitFiles([GENERATED])), read: (file) => readFileSync(file, "utf8") }
  const scenarios = requested.length > 0 ? requested : Object.values(FEATURE_SCENARIO)
  const failed = scenarios.filter((scenario) => !checkScenario(scenario, files, project))

  if (failed.length > 0) {
    console.error(`check:features: the site does not check ${failed.map((scenario) => `in ${scenario}`).join(", ")}`)
    process.exit(FAILURE_EXIT_CODE)
  }
}
