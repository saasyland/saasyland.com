import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import * as zod from "zod"

import { SKILL_SOURCES, matchesPackage } from "../src/data/skills.ts"
import type { Dependency } from "./dependencies.ts"

export const SKILLS_LOCK = "skills-lock.json"
export const SKILL_PACKAGES = "skills-packages.json"
export const SKILLS_UPDATE_COMMAND = "bun run skills:update"
export const SKILLS_SYNC_COMMAND = "bun run skills:sync"

const JSON_INDENT = 2

const lockedSkillSchema = zod.object({
  commit: zod.string().optional(),
  computedHash: zod.string(),
  skillPath: zod.string(),
  source: zod.string(),
})
const skillsLockSchema = zod.object({ skills: zod.record(zod.string(), lockedSkillSchema) })
const recordedVersionsSchema = zod.record(zod.string(), zod.string())

export type LockedSkill = zod.infer<typeof lockedSkillSchema>

export type SkillsLock = Readonly<Record<string, LockedSkill>>

export type PackageVersions = Readonly<Record<string, string>>

const readJson = (path: string): unknown => JSON.parse(readFileSync(path, "utf8"))

export const readSkillsLock = (root: string): SkillsLock => skillsLockSchema.parse(readJson(join(root, SKILLS_LOCK))).skills

export const documentedDependencies = (patterns: readonly string[], dependencies: readonly Dependency[]): Dependency[] =>
  dependencies.filter(({ name }) => patterns.some((pattern) => matchesPackage(pattern, name)))

export const skillPackageVersions = (dependencies: readonly Dependency[]): PackageVersions => {
  const documented = Object.values(SKILL_SOURCES).flatMap(({ packages }) => documentedDependencies(packages, dependencies))
  const versions = documented.map(({ name, version }) => [name, version] as const).toSorted(([left], [right]) => left.localeCompare(right))

  return Object.fromEntries(versions)
}

export const readRecordedVersions = (root: string): PackageVersions => {
  const path = join(root, SKILL_PACKAGES)

  return existsSync(path) ? recordedVersionsSchema.parse(readJson(path)) : {}
}

export const writeRecordedVersions = (root: string, versions: PackageVersions): void => {
  writeFileSync(join(root, SKILL_PACKAGES), `${JSON.stringify(versions, undefined, JSON_INDENT)}\n`)
}
