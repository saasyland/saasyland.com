import { spawnSync } from "node:child_process"
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, posix, resolve } from "node:path"
import process from "node:process"
import * as zod from "zod"

import { AREA, AREAS, AREA_SCENARIO, AREA_SCENARIOS, type Area, type AreaScenario } from "./areas.ts"
import { type PruneProblem, pruneProject } from "./prune-references.ts"
import { FAILURE_EXIT_CODE, runCommand, scriptArguments } from "./run-command.ts"

const MESSAGES = "messages"
const MESSAGE_EXTENSION = ".json"
const GENERATED = ":(attr:linguist-generated)"
const DEPENDENCIES = "node_modules"
const CORE_DERIVED = ["generate:cn"]
const ROUTE_TREE = "generate:routes"
const TYPE_CHECK = ["run", "tsc", "--noEmit"]

const scenarioSchema = zod.enum(AREA_SCENARIO)

export interface AreaRemoval {
  readonly kept: readonly string[]
  readonly problems: readonly PruneProblem[]
  readonly removed: readonly Area[]
  readonly sources: ReadonlyMap<string, string>
}

export interface ProjectSource {
  readonly generated: ReadonlySet<string>
  readonly read: (file: string) => string
}

export const removedAreas = (areas: readonly Area[]): Area[] => {
  const dependents = Object.values(AREA).filter(
    (area) => !areas.includes(area) && AREAS[area].requires.some((required) => areas.includes(required)),
  )

  return dependents.length > 0 ? removedAreas([...areas, ...dependents]) : areas.toSorted()
}

export const isInFootprint = (file: string, areas: readonly Area[]): boolean =>
  areas.some((area) => AREAS[area].files.some((glob) => posix.matchesGlob(file, glob)))

export const removedNames = (areas: readonly Area[]): Map<string, string[]> =>
  new Map(
    [
      ...Map.groupBy(
        areas.flatMap((area) => Object.entries(AREAS[area].names ?? {})),
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

export const areaRemoval = (areas: readonly Area[], files: readonly string[], { generated, read }: ProjectSource): AreaRemoval => {
  const removed = removedAreas(areas)
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

const copyProject = ({ kept, sources }: AreaRemoval, root: string): void => {
  for (const file of kept) {
    mkdirSync(posix.dirname(join(root, file)), { recursive: true })
    cpSync(file, join(root, file))
  }

  for (const [file, source] of sources) {
    writeFileSync(join(root, file), source)
  }

  symlinkSync(resolve(DEPENDENCIES), join(root, DEPENDENCIES))
}

const derivedScripts = (removed: readonly Area[]): string[] => [
  ...CORE_DERIVED,
  ...Object.values(AREA)
    .filter((area) => !removed.includes(area))
    .flatMap((area) => AREAS[area].derive ?? []),
  ROUTE_TREE,
]

const typeChecks = (removal: AreaRemoval, root: string): boolean =>
  derivedScripts(removal.removed).every((script) => runCommand("bun", ["run", script], { cwd: root }).status === 0) &&
  runCommand("bun", TYPE_CHECK, { cwd: root }).status === 0

const checkScenario = (scenario: AreaScenario, files: readonly string[], project: ProjectSource): boolean => {
  const removal = areaRemoval(AREA_SCENARIOS[scenario], files, project)
  const root = mkdtempSync(join(tmpdir(), `check-areas-${scenario}-`))

  console.log(
    `check:areas ${scenario}: without ${removal.removed.join(", ")}; ${String(files.length - removal.kept.length)} files deleted, ${String(removal.sources.size)} files pruned, ${String(removal.problems.length)} references left that cannot be pruned`,
  )

  if (removal.problems.length > 0) {
    console.error(problemLines(removal.problems).join("\n"))
  }

  try {
    copyProject(removal, root)

    return typeChecks(removal, root) && removal.problems.length === 0
  } finally {
    rmSync(root, { force: true, recursive: true })
  }
}

if (import.meta.main) {
  const requested = scriptArguments().map((scenario) => scenarioSchema.parse(scenario))
  const files = gitFiles([])
  const project: ProjectSource = { generated: new Set(gitFiles([GENERATED])), read: (file) => readFileSync(file, "utf8") }
  const scenarios = requested.length > 0 ? requested : Object.values(AREA_SCENARIO)
  const failed = scenarios.filter((scenario) => !checkScenario(scenario, files, project))

  if (failed.length > 0) {
    console.error(`check:areas: the site does not type-check ${failed.map((scenario) => `in ${scenario}`).join(", ")}`)
    process.exit(FAILURE_EXIT_CODE)
  }
}
