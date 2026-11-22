import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { z } from "zod/v4"

import { SKILL_SOURCES, matchesPackage } from "../src/data/skills.ts"
import type { Dependency } from "./dependencies.ts"

export const SKILLS_LOCK = "skills-lock.json"
export const SKILL_PACKAGES = "skills-packages.json"
export const SKILLS_UPDATE_COMMAND = "bun run skills:update"
export const SKILLS_SYNC_COMMAND = "bun run skills:sync"

const JSON_INDENT = 2

const lockedSkillSchema = z.object({
  commit: z.string().optional(),
  computedHash: z.string(),
  skillPath: z.string(),
  source: z.string(),
})
const skillsLockSchema = z.object({ skills: z.record(z.string(), lockedSkillSchema) })
const recordedVersionsSchema = z.record(z.string(), z.string())

export type LockedSkill = z.infer<typeof lockedSkillSchema>

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
