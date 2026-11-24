import { createHash } from "node:crypto"
import { existsSync, lstatSync, readFileSync, readdirSync, readlinkSync, realpathSync, statSync } from "node:fs"
import { join, sep } from "node:path"
import process from "node:process"

import { SKILL_SOURCES } from "../src/data/skills.ts"
import { BUN_LOCK, type Dependency, PACKAGE_JSON, readDependencies } from "./dependencies.ts"
import { FAILURE_EXIT_CODE } from "./run-command.ts"
import {
  type PackageVersions,
  SKILLS_LOCK,
  SKILLS_SYNC_COMMAND,
  SKILLS_UPDATE_COMMAND,
  SKILL_PACKAGES,
  type SkillsLock,
  documentedDependencies,
  readRecordedVersions,
  readSkillsLock,
  skillPackageVersions,
} from "./skills-lock.ts"
import { AGENTS_SKILLS, CLAUDE_SKILLS, groupRoot, linkTarget, skillLocation } from "./sync-skills.ts"

const SKILL_FILE = "SKILL.md"
const PATH_SEPARATOR = "/"
const HASH_SEPARATOR = "\0"
const WINDOWS_LINE_ENDING = "\r\n"
const LINE_ENDING = "\n"
const NUL_BYTE = 0
const EXCLUDED_FILES = new Set(["metadata.json"])
const EXCLUDED_DIRECTORIES = new Set([".git", "__pycache__", "__pypackages__"])

interface SkillFile {
  readonly content: Buffer
  readonly path: Buffer
}

const isExcluded = (name: string, isDirectory: boolean): boolean =>
  EXCLUDED_FILES.has(name) || (isDirectory && EXCLUDED_DIRECTORIES.has(name))

const normalizeLineEndings = (content: Buffer): Buffer => {
  if (content.includes(NUL_BYTE) || !content.includes(WINDOWS_LINE_ENDING)) {
    return content
  }

  return Buffer.from(content.toString("latin1").replaceAll(WINDOWS_LINE_ENDING, LINE_ENDING), "latin1")
}

const isInside = (path: string, root: string): boolean => path === root || path.startsWith(`${root}${sep}`)

interface Walk {
  readonly ancestors: ReadonlySet<string>
  readonly prefix: string
  readonly root: string
}

const collectFiles = (directory: string, { ancestors, prefix, root }: Walk): SkillFile[] => {
  const real = realpathSync(directory)

  if (ancestors.has(real)) {
    return []
  }

  const branch = new Set(ancestors).add(real)

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(directory, entry.name)
    const path = `${prefix}${entry.name}`
    const linked = entry.isSymbolicLink() && existsSync(fullPath) && isInside(realpathSync(fullPath), root)

    if (isExcluded(entry.name, entry.isDirectory()) || (entry.isSymbolicLink() && !linked)) {
      return []
    }

    const isDirectory = linked ? statSync(fullPath).isDirectory() : entry.isDirectory()

    if (isDirectory) {
      return isExcluded(entry.name, true) ? [] : collectFiles(fullPath, { ancestors: branch, prefix: `${path}${PATH_SEPARATOR}`, root })
    }

    return linked || entry.isFile() ? [{ content: normalizeLineEndings(readFileSync(fullPath)), path: Buffer.from(path, "utf8") }] : []
  })
}

export const skillFolderHash = (directory: string): string => {
  const hash = createHash("sha256")
  const files = collectFiles(directory, { ancestors: new Set(), prefix: "", root: realpathSync(directory) }).toSorted((left, right) =>
    Buffer.compare(left.path, right.path),
  )
  for (const { content, path } of files) {
    hash.update(path)
    hash.update(HASH_SEPARATOR)
    hash.update(String(content.length))
    hash.update(HASH_SEPARATOR)
    hash.update(content)
  }

  return hash.digest("hex")
}

const isSkillSource = (source: string): boolean => Object.hasOwn(SKILL_SOURCES, source)

export const sourceProblems = (skills: SkillsLock): string[] => {
  const locked = new Set(Object.values(skills).map(({ source }) => source))

  return [
    ...[...locked]
      .filter((source) => !isSkillSource(source))
      .map(
        (source) =>
          `${source} is in ${SKILLS_LOCK} but not in SKILL_SOURCES (src/data/skills.ts): add its group and the packages its skills document`,
      ),
    ...Object.keys(SKILL_SOURCES)
      .filter((source) => !locked.has(source))
      .map((source) => `${source} is in SKILL_SOURCES but no skill in ${SKILLS_LOCK} comes from it: remove it`),
  ]
}

const versionProblem = (name: string, current: string | undefined, recorded: string | undefined): string[] => {
  if (current === recorded) {
    return []
  }

  if (current === undefined) {
    return [`${SKILL_PACKAGES} records ${name}, which no skill source documents: run ${SKILLS_UPDATE_COMMAND}`]
  }

  if (recorded === undefined) {
    return [`${name} ${current} has no version in ${SKILL_PACKAGES}: run ${SKILLS_UPDATE_COMMAND}`]
  }

  return [`${name} is ${current} in ${BUN_LOCK}, but the agent skills were last updated for ${recorded}: run ${SKILLS_UPDATE_COMMAND}`]
}

export const packageProblems = (dependencies: readonly Dependency[], recorded: PackageVersions): string[] => {
  const current = skillPackageVersions(dependencies)
  const names = [...new Set([...Object.keys(current), ...Object.keys(recorded)])].toSorted((left, right) => left.localeCompare(right))

  return [
    ...Object.entries(SKILL_SOURCES).flatMap(([source, { packages }]) =>
      packages
        .filter((pattern) => documentedDependencies([pattern], dependencies).length === 0)
        .map((pattern) => `${source} documents ${pattern}, which ${PACKAGE_JSON} does not list: remove it from SKILL_SOURCES`),
    ),
    ...names.flatMap((name) => versionProblem(name, current[name], recorded[name])),
  ]
}

interface InstalledLayout {
  readonly directory: string
  readonly groups: ReadonlySet<string>
  readonly locations: ReadonlySet<string>
}

const unexpectedEntries = (layout: InstalledLayout, relative: string): string[] =>
  readdirSync(join(layout.directory, relative)).flatMap((name) => {
    const path = relative.length === 0 ? name : `${relative}${PATH_SEPARATOR}${name}`

    if (layout.locations.has(path)) {
      return []
    }

    if (layout.groups.has(path)) {
      return unexpectedEntries(layout, path)
    }

    return [`${AGENTS_SKILLS}/${path} is not in ${SKILLS_LOCK}: run ${SKILLS_SYNC_COMMAND}`]
  })

const parentsOf = (location: string): string[] => {
  const parts = location.split(PATH_SEPARATOR)

  return parts.slice(1).map((_, index) => parts.slice(0, index + 1).join(PATH_SEPARATOR))
}

const linkProblems = (root: string, roots: readonly string[]): string[] => {
  const directory = join(root, CLAUDE_SKILLS)

  if (!existsSync(directory)) {
    return [`${CLAUDE_SKILLS} is missing: run ${SKILLS_SYNC_COMMAND}`]
  }

  const present = readdirSync(directory)

  return [
    ...roots
      .filter(
        (group) =>
          !present.includes(group) ||
          !lstatSync(join(directory, group)).isSymbolicLink() ||
          readlinkSync(join(directory, group)) !== linkTarget(group),
      )
      .map((group) => `${CLAUDE_SKILLS}/${group} does not link to ${AGENTS_SKILLS}/${group}: run ${SKILLS_SYNC_COMMAND}`),
    ...present
      .filter((name) => !roots.includes(name))
      .map((name) => `${CLAUDE_SKILLS}/${name} is not a skill group: run ${SKILLS_SYNC_COMMAND}`),
  ]
}

const installedSkillProblem = (directory: string, location: string, hash: string): string[] => {
  const path = join(directory, location)

  if (!existsSync(join(path, SKILL_FILE))) {
    return [`${AGENTS_SKILLS}/${location} is missing: run ${SKILLS_SYNC_COMMAND}`]
  }

  if (skillFolderHash(path) === hash) {
    return []
  }

  return [`${AGENTS_SKILLS}/${location} differs from ${SKILLS_LOCK}: run ${SKILLS_SYNC_COMMAND} to restore it`]
}

export const installProblems = (root: string, skills: SkillsLock): string[] => {
  const directory = join(root, AGENTS_SKILLS)

  if (!existsSync(directory)) {
    return []
  }

  const installed = Object.entries(skills).map(([name, entry]) => ({ hash: entry.computedHash, location: skillLocation(name, entry) }))
  const locations = new Set(installed.map(({ location }) => location))
  const groups = new Set(installed.flatMap(({ location }) => parentsOf(location)))
  const roots = [...new Set([...groups].map((group) => groupRoot(group)))].toSorted((left, right) => left.localeCompare(right))

  return [
    ...installed.flatMap(({ hash, location }) => installedSkillProblem(directory, location, hash)),
    ...unexpectedEntries({ directory, groups, locations }, ""),
    ...linkProblems(root, roots),
  ]
}

export const skillProblems = (root: string): string[] => {
  const skills = readSkillsLock(root)

  return [
    ...sourceProblems(skills),
    ...packageProblems(readDependencies(root), readRecordedVersions(root)),
    ...installProblems(root, skills),
  ]
}

if (import.meta.main) {
  const problems = skillProblems(process.cwd())

  if (problems.length > 0) {
    console.error(`✗ The agent skills drifted from their lock:\n  ${problems.join("\n  ")}`)
    process.exit(FAILURE_EXIT_CODE)
  }
}
