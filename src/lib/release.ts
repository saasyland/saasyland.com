import { execFileSync } from "node:child_process"

import { type Changelog, type ChangelogEntry, ENTRY_ORIGIN, RELEASE_TAG, joinEntries, originOf } from "~/src/lib/changelog"

import { APP_URL } from "~/src/presentation/branding"
import * as ROUTES from "~/src/routes"

interface GitTag {
  readonly commit: string
  readonly name: string
}

const CHANGELOG_URL = `${APP_URL}${ROUTES.DOCS}/project/changelog`

const UTC_TIMESTAMP = /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})T.+$/u
const FIRST_TAG = "v$<year>.$<month>.$<day>"
const SITE_LINK = "](/"
const TAG_FORMAT = "--format=%(objectname)%09%(refname:lstrip=2)"
const TAG_REFS = "refs/tags"
const TAG_FIELD_SEPARATOR = "\t"

const FIRST_SEQUENCE = 1

const referenceOf = ({ key }: ChangelogEntry): string => (originOf(key) === ENTRY_ORIGIN.PULL_REQUEST ? `(#${key})` : `(${key})`)

const sequenceOn = (firstTag: string, name: string): number => {
  const release = RELEASE_TAG.exec(name)?.groups

  if (release?.["firstTag"] !== firstTag) {
    return 0
  }

  return Number(release["sequence"] ?? FIRST_SEQUENCE)
}

export const readTags = (cwd: string): GitTag[] =>
  execFileSync("git", ["for-each-ref", TAG_FORMAT, TAG_REFS], { cwd, encoding: "utf8" })
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => {
      const [commit = "", name = ""] = line.split(TAG_FIELD_SEPARATOR)

      return { commit, name }
    })

export const releaseTag = (commit: string, deployedAt: Date, tags: readonly GitTag[]): string => {
  const released = tags.find((tag) => tag.commit === commit && RELEASE_TAG.test(tag.name))

  if (released !== undefined) {
    return released.name
  }

  const firstTag = deployedAt.toISOString().replace(UTC_TIMESTAMP, FIRST_TAG)
  const next = tags.reduce((latest, { name }) => Math.max(latest, sequenceOn(firstTag, name)), 0) + 1

  return next === FIRST_SEQUENCE ? firstTag : `${firstTag}.${String(next)}`
}

export const releaseNotes = (changelog: Changelog, tag: string): string => {
  const shipped = changelog.days.flatMap(({ entries }) => entries).filter(({ release }) => release === tag)

  if (shipped.length === 0) {
    return `See the [changelog](${CHANGELOG_URL}).`
  }

  return joinEntries(shipped, referenceOf).replaceAll(SITE_LINK, `](${APP_URL}/`)
}
