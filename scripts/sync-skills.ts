import { existsSync, mkdirSync, renameSync, rmSync, symlinkSync } from "node:fs"
import { dirname, join } from "node:path"
import process from "node:process"

import { SKILL_SOURCES, TANSTACK_ROUTER } from "../src/data/skills.ts"
import { readDependencies } from "./dependencies.ts"
import { FAILURE_EXIT_CODE, runCommand } from "./run-command.ts"
import { type LockedSkill, type SkillsLock, readSkillsLock, skillPackageVersions, writeRecordedVersions } from "./skills-lock.ts"

export const AGENTS_SKILLS = ".agents/skills"
export const CLAUDE_SKILLS = ".claude/skills"
export const UPDATE_ARGUMENT = "update"
export const SKILLS_INSTALL: readonly string[] = ["experimental_install"]
export const SKILLS_UPDATE: readonly string[] = ["update", "--project", "--yes"]
export const SKILLS_UPDATE_SCRIPT: readonly string[] = ["scripts/sync-skills.ts", UPDATE_ARGUMENT]

const SUCCESS_EXIT_CODE = 0
const LEGACY_AGENT_DIRECTORY = "agent"
const STAGING_DIRECTORY = ".staging"
const GROUP_SEPARATOR = "/"
const FIXED_PATH = "/usr/bin:/bin:/usr/sbin:/sbin"
const TANSTACK_START_GROUP = "tanstack/start"
const TANSTACK_START_SKILL_PATH = /^packages\/(?:react-start|start-[^/]+)\//u

const SKILL_GROUPS = new Map<string, string>(Object.entries(SKILL_SOURCES).map(([source, { group }]) => [source, group]))

export type RunSkills = (args: readonly string[]) => number

export interface SyncResult {
  readonly failures: readonly string[]
  readonly summary: string
  readonly warnings: readonly string[]
}

const skillGroup = ({ skillPath, source }: LockedSkill): string | undefined => {
  if (source === TANSTACK_ROUTER && TANSTACK_START_SKILL_PATH.test(skillPath)) {
    return TANSTACK_START_GROUP
  }

  return SKILL_GROUPS.get(source)
}

export const skillLocation = (name: string, entry: LockedSkill): string => {
  const group = skillGroup(entry)

  return group === undefined ? name : `${group}${GROUP_SEPARATOR}${name}`
}

export const groupRoot = (location: string): string => location.split(GROUP_SEPARATOR)[0] ?? location

export const linkTarget = (root: string): string => `../../${AGENTS_SKILLS}/${root}`

const sorted = (values: Iterable<string>): string[] => [...new Set(values)].toSorted((left, right) => left.localeCompare(right))

interface SkillDirectories {
  readonly agents: string
  readonly staging: string
}

interface Placement {
  readonly roots: readonly string[]
  readonly ungrouped: readonly string[]
  readonly warnings: readonly string[]
}

const stageSkills = (directories: SkillDirectories, names: readonly string[]): void => {
  mkdirSync(directories.staging, { recursive: true })
  for (const name of names) {
    if (existsSync(join(directories.agents, name))) {
      renameSync(join(directories.agents, name), join(directories.staging, name))
    }
  }
}

const placeSkill = (directories: SkillDirectories, name: string, entry: LockedSkill): Placement => {
  const staged = join(directories.staging, name)

  if (!existsSync(staged)) {
    return { roots: [], ungrouped: [], warnings: [`${name} was not restored by the skills CLI; run bunx skills add for it.`] }
  }

  const location = skillLocation(name, entry)
  mkdirSync(dirname(join(directories.agents, location)), { recursive: true })
  renameSync(staged, join(directories.agents, location))

  if (location === name) {
    return {
      roots: [],
      ungrouped: [entry.source],
      warnings: [`${name} (${entry.source}) has no group in SKILL_SOURCES; leaving it at the top level.`],
    }
  }

  return { roots: [groupRoot(location)], ungrouped: [], warnings: [] }
}

const linkGroups = (root: string, groups: readonly string[]): void => {
  const directory = join(root, CLAUDE_SKILLS)
  rmSync(directory, { force: true, recursive: true })
  mkdirSync(directory, { recursive: true })
  for (const group of groups) {
    symlinkSync(linkTarget(group), join(directory, group))
  }
}

export const arrangeSkills = (root: string, skills: SkillsLock): SyncResult => {
  const directories = { agents: join(root, AGENTS_SKILLS), staging: join(root, AGENTS_SKILLS, STAGING_DIRECTORY) }
  stageSkills(directories, Object.keys(skills))
  const placements = Object.entries(skills).map(([name, entry]) => placeSkill(directories, name, entry))
  rmSync(directories.staging, { force: true, recursive: true })

  const grouped = placements.flatMap(({ roots }) => roots)
  const ungrouped = placements.flatMap((placement) => placement.ungrouped)
  const warnings = placements.flatMap((placement) => placement.warnings)
  const linked = sorted(grouped)
  linkGroups(root, linked)

  const summary = `Restored ${String(Object.keys(skills).length)} skills, grouped ${String(grouped.length)}, linked ${linked.join(", ")} into ${CLAUDE_SKILLS}.`

  if (ungrouped.length === 0) {
    return { failures: [], summary, warnings }
  }

  const sources = sorted(ungrouped).join(", ")

  return {
    failures: [`${String(ungrouped.length)} skills stayed at the top level. Add these sources to SKILL_SOURCES: ${sources}`],
    summary,
    warnings,
  }
}

export const syncSkills = ({ root, run, update }: { root: string; run: RunSkills; update: boolean }): SyncResult => {
  rmSync(join(root, AGENTS_SKILLS), { force: true, recursive: true })
  rmSync(join(root, LEGACY_AGENT_DIRECTORY), { force: true, recursive: true })

  const commands = update ? [SKILLS_INSTALL, SKILLS_UPDATE] : [SKILLS_INSTALL]
  const failed = commands.find((args) => run(args) !== SUCCESS_EXIT_CODE)

  if (failed !== undefined) {
    return { failures: [`skills ${failed.join(" ")} failed`], summary: "", warnings: [] }
  }

  const result = arrangeSkills(root, readSkillsLock(root))

  if (update) {
    writeRecordedVersions(root, skillPackageVersions(readDependencies(root)))
  }

  return result
}

if (import.meta.main) {
  const run: RunSkills = (args) =>
    runCommand(process.execPath, ["x", "--bun", "skills", ...args], { env: { ...process.env, PATH: FIXED_PATH } }).status
  const { failures, summary, warnings } = syncSkills({ root: process.cwd(), run, update: process.argv.includes(UPDATE_ARGUMENT) })

  for (const warning of warnings) {
    console.warn(`! ${warning}`)
  }

  if (summary.length > 0) {
    console.log(`\n✓ ${summary}`)
  }

  if (failures.length > 0) {
    console.error(`\n✗ ${failures.join("\n✗ ")}`)
    process.exit(FAILURE_EXIT_CODE)
  }
}
