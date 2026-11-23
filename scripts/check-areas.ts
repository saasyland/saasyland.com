import { spawnSync } from "node:child_process"
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, posix, resolve } from "node:path"
import process from "node:process"
import * as zod from "zod"

import { AREA, AREAS, AREA_SCENARIO, AREA_SCENARIOS, type Area, type AreaScenario } from "./areas.ts"
import { FAILURE_EXIT_CODE, runCommand, scriptArguments } from "./run-command.ts"

const ROOT_ALIAS = "~/"
const RELATIVE_PREFIX = "."
const TYPESCRIPT_EXTENSION = ".ts"
const MODULE_SUFFIXES = ["", TYPESCRIPT_EXTENSION, ".tsx", "/index.ts", "/index.tsx"]
const RE_EXPORT = /export \{[^}]*\} from "(?<module>[^"]+)"\n?/gu
const DEPENDENCIES = "node_modules"
const CORE_DERIVED = ["generate:cn"]
const ROUTE_TREE = "generate:routes"
const TYPE_CHECK = ["run", "tsc", "--noEmit"]

const reExportSchema = zod.object({ module: zod.string() })
const scenarioSchema = zod.enum(AREA_SCENARIO)

export interface AreaRemoval {
  readonly barrels: ReadonlyMap<string, string>
  readonly kept: readonly string[]
  readonly removed: readonly Area[]
}

export const removedAreas = (areas: readonly Area[]): Area[] => {
  const dependents = Object.values(AREA).filter(
    (area) => !areas.includes(area) && AREAS[area].requires.some((required) => areas.includes(required)),
  )

  return dependents.length > 0 ? removedAreas([...areas, ...dependents]) : areas.toSorted()
}

export const isInFootprint = (file: string, areas: readonly Area[]): boolean =>
  areas.some((area) => AREAS[area].files.some((glob) => posix.matchesGlob(file, glob)))

const isLocalModule = (specifier: string): boolean => specifier.startsWith(ROOT_ALIAS) || specifier.startsWith(RELATIVE_PREFIX)

const modulePath = (barrel: string, specifier: string): string =>
  specifier.startsWith(ROOT_ALIAS) ? specifier.slice(ROOT_ALIAS.length) : posix.join(posix.dirname(barrel), specifier)

export const isMissingModule = (barrel: string, specifier: string, files: ReadonlySet<string>): boolean =>
  isLocalModule(specifier) && !MODULE_SUFFIXES.some((suffix) => files.has(`${modulePath(barrel, specifier)}${suffix}`))

const reExportsOf = (source: string): RegExpExecArray[] => [...source.matchAll(RE_EXPORT)]

export const isBarrel = (source: string): boolean => reExportsOf(source).length > 0 && source.replaceAll(RE_EXPORT, "").trim().length === 0

export const prunedBarrel = (barrel: string, source: string, files: ReadonlySet<string>): string =>
  reExportsOf(source)
    .filter((statement) => !isMissingModule(barrel, reExportSchema.parse(statement.groups).module, files))
    .map(([statement]) => statement)
    .join("")

const prunedBarrels = (files: readonly string[], read: (file: string) => string): Map<string, string> => {
  const present = new Set(files)

  return new Map(
    files
      .filter((file) => file.endsWith(TYPESCRIPT_EXTENSION))
      .flatMap((file) => {
        const source = read(file)
        const pruned = prunedBarrel(file, source, present)

        return isBarrel(source) && pruned !== source ? [[file, pruned] as const] : []
      }),
  )
}

export const areaRemoval = (areas: readonly Area[], files: readonly string[], read: (file: string) => string): AreaRemoval => {
  const removed = removedAreas(areas)
  const kept = files.filter((file) => !isInFootprint(file, removed))

  return { barrels: prunedBarrels(kept, read), kept, removed }
}

const projectFiles = (): string[] => {
  const { stdout } = spawnSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard", "--deduplicate"], {
    encoding: "utf8",
  })

  return stdout.split("\0").filter((file) => file.length > 0 && existsSync(file))
}

const copyProject = ({ barrels, kept }: AreaRemoval, root: string): void => {
  for (const file of kept) {
    mkdirSync(posix.dirname(join(root, file)), { recursive: true })
    cpSync(file, join(root, file))
  }

  for (const [file, source] of barrels) {
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

const checkScenario = (scenario: AreaScenario, files: readonly string[]): boolean => {
  const removal = areaRemoval(AREA_SCENARIOS[scenario], files, (file) => readFileSync(file, "utf8"))
  const root = mkdtempSync(join(tmpdir(), `check-areas-${scenario}-`))

  console.log(
    `check:areas ${scenario}: without ${removal.removed.join(", ")}; ${String(files.length - removal.kept.length)} files deleted, ${String(removal.barrels.size)} barrels pruned`,
  )

  try {
    copyProject(removal, root)

    return typeChecks(removal, root)
  } finally {
    rmSync(root, { force: true, recursive: true })
  }
}

if (import.meta.main) {
  const requested = scriptArguments().map((scenario) => scenarioSchema.parse(scenario))
  const files = projectFiles()
  const scenarios = requested.length > 0 ? requested : Object.values(AREA_SCENARIO)
  const failed = scenarios.filter((scenario) => !checkScenario(scenario, files))

  if (failed.length > 0) {
    console.error(`check:areas: the site does not type-check ${failed.map((scenario) => `in ${scenario}`).join(", ")}`)
    process.exit(FAILURE_EXIT_CODE)
  }
}
