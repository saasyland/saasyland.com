import { execFileSync } from "node:child_process"
import { readFile, readdir } from "node:fs/promises"
import { join } from "node:path"

import { MILLISECONDS_PER_SECOND } from "./duration"

export interface ChangelogEntry {
  readonly key: string
  readonly source: string
}

export interface ChangelogDay {
  readonly date: string
  readonly entries: readonly ChangelogEntry[]
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

export const MAIN_BRANCH = "main"

const MAIN_REF = `refs/heads/${MAIN_BRANCH}`
const PULL_REQUEST_KEY = /^[1-9]\d*$/u

const SQUASHED_PULL_REQUEST = /\(#(?<number>[1-9]\d*)\)$/u
const PULL_REQUEST_REF = /^refs\/pull\/(?<number>[1-9]\d*)\/merge$/u
const TIME_OF_DAY = /T.+$/u
const LOG_FORMAT = "--format=%H%x09%ct%x09%s"
const LOG_FIELD_SEPARATOR = "\t"
const SHALLOW_REPOSITORY = "true"

const keyOrder = new Intl.Collator(undefined, { numeric: true })

const git = (cwd: string, args: readonly string[]): string =>
  execFileSync("git", args, { cwd, encoding: "utf8", maxBuffer: Number.POSITIVE_INFINITY }).trim()

const mergeTimesOf = (log: string): ReadonlyMap<string, number> =>
  new Map(
    log.split("\n").flatMap((line) => {
      const [commit = "", seconds = "", subject = ""] = line.split(LOG_FIELD_SEPARATOR)
      const pullRequest = SQUASHED_PULL_REQUEST.exec(subject)?.groups?.["number"]
      const keys = pullRequest === undefined ? [commit] : [commit, pullRequest]

      return keys.map((key): [string, number] => [key, Number(seconds)])
    }),
  )

const readMergeTimes = (cwd: string): ReadonlyMap<string, number> => {
  if (git(cwd, ["rev-parse", "--is-shallow-repository"]) === SHALLOW_REPOSITORY) {
    throw new Error(
      `The changelog dates each entry by the commit that brought it to main, and ${cwd} is a shallow clone: run git fetch --unshallow`,
    )
  }

  return mergeTimesOf(git(cwd, ["log", LOG_FORMAT]))
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

export const readChangelog = async ({ cwd, locale }: { cwd: string; locale: string }): Promise<Changelog> => {
  const mergeTimes = readMergeTimes(cwd)
  const entries = await readEntries({ cwd, locale })
  const merged = entries
    .toSorted(byKeyDescending)
    .flatMap((entry) => {
      const time = mergeTimes.get(entry.key)

      return time === undefined ? [] : [{ entry, time }]
    })
    .toSorted((first, second) => second.time - first.time)

  return {
    days: [...Map.groupBy(merged, ({ time }) => dateOf(time))].map(([date, day]) => ({ date, entries: day.map(({ entry }) => entry) })),
    unreleased: entries.filter(({ key }) => !mergeTimes.has(key)).toSorted(byKeyDescending),
  }
}

export const originOf = (key: string): EntryOrigin => (PULL_REQUEST_KEY.test(key) ? ENTRY_ORIGIN.PULL_REQUEST : ENTRY_ORIGIN.COMMIT)

export const joinEntries = (entries: readonly ChangelogEntry[], reference: (entry: ChangelogEntry) => string): string =>
  entries.map((entry) => `${entry.source.trim()} ${reference(entry)}`).join("\n")

export const pullRequestOf = (ref: string): string | undefined => PULL_REQUEST_REF.exec(ref)?.groups?.["number"]

const awaitedEntryOf = ({ baseRef, ref }: ChangelogRun): string | undefined => (baseRef === MAIN_BRANCH ? pullRequestOf(ref) : undefined)

const unreleasedProblems = (entries: readonly ChangelogEntry[], rule: string): string[] =>
  entries.map(
    ({ key }) =>
      `${CHANGELOG_DIRECTORY}/${key}.<locale>.mdx matches no commit on main, so the changelog would list it as unreleased; ${rule}. Delete the entry of a pull request that was closed without merging.`,
  )

export const unreleasedEntryProblems = ({ changelog, run }: { changelog: Changelog; run: ChangelogRun }): string[] => {
  const awaited = awaitedEntryOf(run)

  if (awaited !== undefined) {
    return unreleasedProblems(
      changelog.unreleased.filter(({ key }) => key !== awaited),
      `in pull request #${awaited}, only its own entry may wait for the merge`,
    )
  }

  if (run.ref === MAIN_REF) {
    return unreleasedProblems(changelog.unreleased, "on main, no entry may")
  }

  return []
}
