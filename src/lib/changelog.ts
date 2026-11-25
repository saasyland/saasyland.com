import { execFileSync } from "node:child_process"
import { readFile, readdir } from "node:fs/promises"
import { join } from "node:path"

import { APP_URL } from "../presentation/branding"
import { ROUTES } from "../routes.ts"
import { MILLISECONDS_PER_SECOND } from "./duration"
import { MAIN_BRANCH, RELEASE_TAG } from "./release"

export interface ChangelogEntry {
  readonly key: string
  readonly source: string
}

export interface MergedEntry extends ChangelogEntry {
  readonly release: string | undefined
}

export interface ChangelogDay {
  readonly date: string
  readonly entries: readonly MergedEntry[]
}

export interface Changelog {
  readonly days: readonly ChangelogDay[]
  readonly unreleased: readonly ChangelogEntry[]
}

export interface ChangelogRun {
  readonly baseRef: string
  readonly ref: string
}

export const CHANGELOG_DIRECTORY = "content/changelog"

export const ENTRY_KEY = /^(?:[1-9]\d*|[\da-f]{40})$/u

export const ENTRY_ORIGIN = { COMMIT: "commit", PULL_REQUEST: "pullRequest" } as const

export type EntryOrigin = (typeof ENTRY_ORIGIN)[keyof typeof ENTRY_ORIGIN]

const MAIN_REF = `refs/heads/${MAIN_BRANCH}`
const PULL_REQUEST_KEY = /^[1-9]\d*$/u

const SQUASHED_PULL_REQUEST = /\(#(?<number>[1-9]\d*)\)$/u
const PULL_REQUEST_REF = /^refs\/pull\/(?<number>[1-9]\d*)\/merge$/u
const MERGE_GROUP_REF = new RegExp(String.raw`^refs/heads/gh-readonly-queue/${MAIN_BRANCH}/pr-(?<number>[1-9]\d*)-[\da-f]+$`, "u")
const TIME_OF_DAY = /T.+$/u
const LOG_FORMAT = "--format=%H%x09%ct%x09%D%x09%s"
const FIRST_PARENT = "--first-parent"
const TAG_DECORATIONS = "--decorate-refs=refs/tags/"
const LOG_FIELD_SEPARATOR = "\t"
const DECORATION_SEPARATOR = ", "
const TAG_DECORATION = /^tag: /u
const SHALLOW_REPOSITORY = "true"
const CHANGELOG_URL = `${APP_URL}${ROUTES.DOCS.INDEX}/project/changelog`
const SITE_LINK = "](/"

const keyOrder = new Intl.Collator(undefined, { numeric: true })

const git = (cwd: string, args: readonly string[]): string =>
  execFileSync("git", args, { cwd, encoding: "utf8", maxBuffer: Number.POSITIVE_INFINITY }).trim()

interface LoggedCommit {
  readonly keys: readonly string[]
  readonly releases: readonly string[]
  readonly time: number
}

interface Merge {
  readonly release: string | undefined
  readonly time: number
}

const releaseTagsOf = (decorations: string): string[] =>
  decorations
    .split(DECORATION_SEPARATOR)
    .map((decoration) => decoration.replace(TAG_DECORATION, ""))
    .filter((name) => RELEASE_TAG.test(name))
    .toSorted(keyOrder.compare)

const loggedCommitsOf = (log: string): LoggedCommit[] =>
  log.split("\n").map((line) => {
    const [commit = "", seconds = "", decorations = "", ...subject] = line.split(LOG_FIELD_SEPARATOR)
    const pullRequest = SQUASHED_PULL_REQUEST.exec(subject.join(LOG_FIELD_SEPARATOR))?.groups?.["number"]

    return {
      keys: pullRequest === undefined ? [commit] : [commit, pullRequest],
      releases: releaseTagsOf(decorations),
      time: Number(seconds),
    }
  })

const withUpcomingRelease = (commits: readonly LoggedCommit[], upcomingRelease: string | undefined): LoggedCommit[] =>
  commits.map((commit, index) => {
    if (index > 0 || upcomingRelease === undefined || commit.releases.length > 0) {
      return commit
    }

    return { ...commit, releases: [upcomingRelease] }
  })

const firstReleasesOf = (commits: readonly LoggedCommit[]): (string | undefined)[] => {
  const released = commits.slice(0, commits.findLastIndex(({ releases }) => releases.length > 0) + 1)

  return released.reduce<(string | undefined)[]>((found, { releases }, index) => {
    found.push(releases[0] ?? found[index - 1])

    return found
  }, [])
}

const mergesOf = (commits: readonly LoggedCommit[]): ReadonlyMap<string, Merge> => {
  const releases = firstReleasesOf(commits)
  const merges = commits.flatMap(({ keys, time }, index) => keys.map((key): [string, Merge] => [key, { release: releases[index], time }]))

  return new Map(merges)
}

const readMerges = ({ cwd, upcomingRelease }: { cwd: string; upcomingRelease: string | undefined }): ReadonlyMap<string, Merge> => {
  if (git(cwd, ["rev-parse", "--is-shallow-repository"]) === SHALLOW_REPOSITORY) {
    throw new Error(
      `The changelog dates each entry by the commit that brought it to main, and ${cwd} is a shallow clone: run git fetch --unshallow`,
    )
  }

  const commits = loggedCommitsOf(git(cwd, ["log", FIRST_PARENT, TAG_DECORATIONS, LOG_FORMAT]))

  return mergesOf(withUpcomingRelease(commits, upcomingRelease))
}

const readEntries = async ({ cwd, locale }: { cwd: string; locale: string }): Promise<ChangelogEntry[]> => {
  const directory = join(cwd, CHANGELOG_DIRECTORY)
  const suffix = `.${locale}.mdx`
  const files = await readdir(directory)
  const localeFiles = files.filter((file) => file.endsWith(suffix))

  return Promise.all(
    localeFiles.map(async (file) => ({ key: file.slice(0, -suffix.length), source: await readFile(join(directory, file), "utf8") })),
  )
}

const dateOf = (seconds: number): string => new Date(seconds * MILLISECONDS_PER_SECOND).toISOString().replace(TIME_OF_DAY, "")

const byKeyDescending = (first: ChangelogEntry, second: ChangelogEntry): number => keyOrder.compare(second.key, first.key)

export const readChangelog = async ({
  cwd,
  locale,
  upcomingRelease,
}: {
  cwd: string
  locale: string
  upcomingRelease?: string | undefined
}): Promise<Changelog> => {
  const merges = readMerges({ cwd, upcomingRelease })
  const entries = await readEntries({ cwd, locale })
  const merged = entries
    .toSorted(byKeyDescending)
    .flatMap((entry) => {
      const merge = merges.get(entry.key)

      return merge === undefined ? [] : [{ entry: { ...entry, release: merge.release }, time: merge.time }]
    })
    .toSorted((first, second) => second.time - first.time)

  return {
    days: [...Map.groupBy(merged, ({ time }) => dateOf(time))].map(([date, day]) => ({ date, entries: day.map(({ entry }) => entry) })),
    unreleased: entries.filter(({ key }) => !merges.has(key)).toSorted(byKeyDescending),
  }
}

export const originOf = (key: string): EntryOrigin => (PULL_REQUEST_KEY.test(key) ? ENTRY_ORIGIN.PULL_REQUEST : ENTRY_ORIGIN.COMMIT)

export const entryItems = (source: string): string[] =>
  source
    .trim()
    .split("\n")
    .filter((line) => line.trim().length > 0)

export const joinEntries = <Entry extends ChangelogEntry>(entries: readonly Entry[], reference: (entry: Entry) => string): string =>
  entries.flatMap((entry) => entryItems(entry.source).map((item) => `${item} ${reference(entry)}`)).join("\n")

const referenceOf = ({ key }: ChangelogEntry): string => (originOf(key) === ENTRY_ORIGIN.PULL_REQUEST ? `(#${key})` : `(${key})`)

export const releaseNotes = (changelog: Changelog, tag: string): string => {
  const shipped = changelog.days.flatMap(({ entries }) => entries).filter(({ release }) => release === tag)

  if (shipped.length === 0) {
    return `See the [changelog](${CHANGELOG_URL}).`
  }

  return joinEntries(shipped, referenceOf).replaceAll(SITE_LINK, `](${APP_URL}/`)
}

export const pullRequestOf = (ref: string): string | undefined =>
  (PULL_REQUEST_REF.exec(ref) ?? MERGE_GROUP_REF.exec(ref))?.groups?.["number"]

const unreleasedProblems = (entries: readonly ChangelogEntry[], rule: string): string[] =>
  entries.map(
    ({ key }) =>
      `${CHANGELOG_DIRECTORY}/${key}.<locale>.mdx matches no commit on main, so the changelog would list it as unreleased; ${rule}. Delete the entry of a pull request that was closed without merging.`,
  )

export const unreleasedEntryProblems = ({ changelog, run }: { changelog: Changelog; run: ChangelogRun }): string[] => {
  const awaited = PULL_REQUEST_REF.exec(run.ref)?.groups?.["number"]

  if (awaited !== undefined && run.baseRef === MAIN_BRANCH) {
    return unreleasedProblems(
      changelog.unreleased.filter(({ key }) => key !== awaited),
      `in pull request #${awaited}, only its own entry may wait for the merge`,
    )
  }

  if (MERGE_GROUP_REF.test(run.ref)) {
    return unreleasedProblems(
      changelog.unreleased,
      "in the merge queue, whose branch already holds the squash commit of every pull request in the group, no entry may",
    )
  }

  if (run.ref === MAIN_REF) {
    return unreleasedProblems(changelog.unreleased, "on main, no entry may")
  }

  return []
}
