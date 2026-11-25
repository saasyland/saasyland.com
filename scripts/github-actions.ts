import { globSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import * as zod from "zod"

import { isNewer } from "./dependencies.ts"
import { runCommand } from "./run-command.ts"

export const WORKFLOW_FILES: readonly string[] = [".github/workflows/*.yml", ".github/actions/**/action.yml"]
export const COMMIT = /^[\da-f]{40}$/u
export const RELEASE_TAG = /^v?\d+\.\d+\.\d+$/u

const SUCCESS_EXIT_CODE = 0
const LINE_BREAK = "\n"
const PEELED_SUFFIX = "^{}"
const VERSION_PREFIX = /^v/u
const REFERENCE_LINE =
  /^(?<prefix>\s*(?:-\s+)?uses:\s+)(?<action>(?<repository>[\w-][\w.-]*\/[\w.-]+)(?:\/[^\s@]+)?)@(?<ref>\S+)(?: # (?<tag>\S+))?\s*$/u
const REMOTE_TAG = /^(?<commit>[\da-f]{40})\trefs\/tags\/(?<name>\S+)$/u

const referenceLineSchema = zod.object({
  action: zod.string(),
  prefix: zod.string(),
  ref: zod.string(),
  repository: zod.string(),
  tag: zod.string().optional(),
})
const remoteTagSchema = zod.object({ commit: zod.string(), name: zod.string() })

export interface ActionReference {
  readonly action: string
  readonly file: string
  readonly ref: string
  readonly repository: string
  readonly tag?: string
}

export interface ActionRelease {
  readonly commit: string
  readonly version: string
}

export interface ActionChange {
  readonly from: string
  readonly name: string
  readonly to: string
}

export type LatestRelease = (repository: string) => ActionRelease

type ReferenceLine = zod.infer<typeof referenceLineSchema>

type RemoteTag = zod.infer<typeof remoteTagSchema>

const parseLine = (line: string): ReferenceLine[] => {
  const match = REFERENCE_LINE.exec(line)

  return match === null ? [] : [referenceLineSchema.parse(match.groups)]
}

const toReference = (file: string, { action, ref, repository, tag }: ReferenceLine): ActionReference => {
  if (tag === undefined) {
    return { action, file, ref, repository }
  }

  return { action, file, ref, repository, tag }
}

export const referencesIn = (file: string, source: string): ActionReference[] =>
  source
    .split(LINE_BREAK)
    .flatMap((line) => parseLine(line))
    .map((reference) => toReference(file, reference))

export const workflowPaths = (root: string): string[] =>
  WORKFLOW_FILES.flatMap((pattern) => globSync(pattern, { cwd: root })).toSorted((left, right) => left.localeCompare(right))

export const actionReferences = (root: string): ActionReference[] =>
  workflowPaths(root).flatMap((file) => referencesIn(file, readFileSync(join(root, file), "utf8")))

const remoteTag = (line: string): RemoteTag[] => {
  const match = REMOTE_TAG.exec(line)

  return match === null ? [] : [remoteTagSchema.parse(match.groups)]
}

const isPeeled = ({ name }: RemoteTag): boolean => name.endsWith(PEELED_SUFFIX)

const tagName = ({ name }: RemoteTag): string => (name.endsWith(PEELED_SUFFIX) ? name.slice(0, -PEELED_SUFFIX.length) : name)

const isNewerRelease = (candidate: string, current: string): boolean =>
  isNewer(candidate.replace(VERSION_PREFIX, ""), current.replace(VERSION_PREFIX, ""))

export const releaseFromTags = (repository: string, output: string): ActionRelease => {
  const tags = output.split(LINE_BREAK).flatMap((line) => remoteTag(line))
  const commits = new Map(
    [...tags.filter((tag) => !isPeeled(tag)), ...tags.filter((tag) => isPeeled(tag))].map((tag) => [tagName(tag), tag.commit]),
  )
  const releases = [...commits.entries()].filter(([name]) => RELEASE_TAG.test(name))
  const [first, ...rest] = releases

  if (first === undefined) {
    throw new Error(`${repository} has no release tag`)
  }

  const [version, commit] = rest.reduce((newest, release) => (isNewerRelease(release[0], newest[0]) ? release : newest), first)

  return { commit, version }
}

export const latestRelease: LatestRelease = (repository) => {
  const { status, stdout } = runCommand("git", ["ls-remote", "--tags", `https://github.com/${repository}.git`], { capture: true })

  if (status !== SUCCESS_EXIT_CODE) {
    throw new Error(`git ls-remote --tags failed for ${repository}`)
  }

  return releaseFromTags(repository, stdout)
}

const latestReleases = (references: readonly ActionReference[], latestOf: LatestRelease): ReadonlyMap<string, ActionRelease> => {
  const repositories = [...new Set(references.map(({ repository }) => repository))].toSorted((left, right) => left.localeCompare(right))

  return new Map(repositories.map((repository) => [repository, latestOf(repository)]))
}

const changeOf = (reference: ActionReference, release: ActionRelease): ActionChange[] => {
  if (reference.ref === release.commit && reference.tag === release.version) {
    return []
  }

  return [{ from: reference.tag ?? reference.ref, name: reference.repository, to: release.version }]
}

const changesOf = (references: readonly ActionReference[], releases: ReadonlyMap<string, ActionRelease>): ActionChange[] => {
  const changes = references.flatMap((reference) => {
    const release = releases.get(reference.repository)

    return release === undefined ? [] : changeOf(reference, release)
  })

  return changes.filter((change, index) => changes.findIndex(({ name }) => name === change.name) === index)
}

export const outdatedActions = (root: string, latestOf: LatestRelease): ActionChange[] => {
  const references = actionReferences(root)

  return changesOf(references, latestReleases(references, latestOf))
}

const pinLine = (line: string, releases: ReadonlyMap<string, ActionRelease>): string =>
  parseLine(line).reduce((pinned, { action, prefix, repository }) => {
    const release = releases.get(repository)

    return release === undefined ? pinned : `${prefix}${action}@${release.commit} # ${release.version}`
  }, line)

export const pinActions = (source: string, releases: ReadonlyMap<string, ActionRelease>): string =>
  source
    .split(LINE_BREAK)
    .map((line) => pinLine(line, releases))
    .join(LINE_BREAK)

export const updateActions = (root: string, latestOf: LatestRelease): ActionChange[] => {
  const references = actionReferences(root)
  const releases = latestReleases(references, latestOf)
  for (const file of workflowPaths(root)) {
    const path = join(root, file)
    const source = readFileSync(path, "utf8")
    const pinned = pinActions(source, releases)

    if (pinned !== source) {
      writeFileSync(path, pinned)
    }
  }

  return changesOf(references, releases)
}
