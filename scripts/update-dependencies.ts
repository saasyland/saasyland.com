import process from "node:process"

import {
  type Dependency,
  type LatestVersion,
  type OutdatedDependency,
  VITE_PLUS,
  isRange,
  isUpdatedByCommand,
  latestVersion,
  outdatedDependencies,
  readDependencies,
} from "./dependencies.ts"
import { type ActionChange, type LatestRelease, latestRelease, updateActions } from "./github-actions.ts"
import { runCommand } from "./run-command.ts"
import { SKILLS_UPDATE_SCRIPT } from "./sync-skills.ts"

const SUCCESS_EXIT_CODE = 0

export const MIGRATE_OPTIONS: readonly string[] = ["--no-interactive", "--no-agent", "--no-editor", "--no-hooks"]

export type Run = (args: readonly string[]) => number

const migrateCommands = (dependencies: readonly Dependency[], latestVitePlus: string): string[][] => {
  if (dependencies.every(({ name, version }) => name !== VITE_PLUS || version === latestVitePlus)) {
    return []
  }

  return [["x", `--package=${VITE_PLUS}@${latestVitePlus}`, "vp", "migrate", ...MIGRATE_OPTIONS]]
}

const rangeUpdateCommands = (dependencies: readonly Dependency[]): string[][] => {
  const ranges = dependencies.filter(({ spec }) => isRange(spec)).map(({ name }) => name)

  return ranges.length === 0 ? [] : [["update", "--latest", ...ranges]]
}

export const updateCommands = (dependencies: readonly Dependency[], latestVitePlus: string): string[][] => [
  ...migrateCommands(dependencies, latestVitePlus),
  ...rangeUpdateCommands(dependencies),
  [...SKILLS_UPDATE_SCRIPT],
]

export const pinnedReport = (outdated: readonly OutdatedDependency[]): string[] =>
  outdated
    .filter((dependency) => !isUpdatedByCommand(dependency))
    .map(
      ({ latest, name, spec }) =>
        `${name} is pinned to ${spec}; ${latest} is out. Read why it is pinned in the Dependencies docs before moving it.`,
    )

export interface UpdateReport {
  readonly actions: readonly ActionChange[]
  readonly pinned: readonly string[]
}

export const updateDependencies = async ({
  latestOf,
  releaseOf,
  root,
  run,
}: {
  latestOf: LatestVersion
  releaseOf: LatestRelease
  root: string
  run: Run
}): Promise<UpdateReport> => {
  const commands = updateCommands(readDependencies(root), await latestOf(VITE_PLUS))
  const failed = commands.find((args) => run(args) !== SUCCESS_EXIT_CODE)

  if (failed !== undefined) {
    throw new Error(`bun ${failed.join(" ")} failed`)
  }

  const actions = updateActions(root, releaseOf)

  return { actions, pinned: pinnedReport(await outdatedDependencies(readDependencies(root), latestOf)) }
}

if (import.meta.main) {
  const { actions, pinned } = await updateDependencies({
    latestOf: latestVersion,
    releaseOf: latestRelease,
    root: process.cwd(),
    run: (args) => runCommand(process.execPath, args).status,
  })

  for (const { from, name, to } of actions) {
    console.log(`↑ ${name} ${from} → ${to}`)
  }

  for (const line of pinned) {
    console.log(`! ${line}`)
  }

  console.log(
    "\n✓ Dependencies, agent skills and GitHub Actions updated. Run bun run check, bun run test:coverage and bun run build:test next.",
  )
}
