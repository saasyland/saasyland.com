import { type Changelog, joinEntries } from "~/src/lib/changelog"

import { APP_URL } from "~/src/presentation/branding"
import { ROUTES } from "~/src/routes"

interface GitTag {
  readonly commit: string
  readonly name: string
}

const CHANGELOG_URL = `${APP_URL}${ROUTES.DOCS}/project/changelog`

const UTC_TIMESTAMP = /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})T.+$/u
const RELEASE_TAG = /^(?<firstTag>v(?<year>\d{4})\.(?<month>\d{2})\.(?<day>\d{2}))(?:\.(?<sequence>\d+))?$/u
const FIRST_TAG = "v$<year>.$<month>.$<day>"
const RELEASE_DATE = "$<year>-$<month>-$<day>"
const SITE_LINK = "](/"

const FIRST_SEQUENCE = 1

const sequenceOn = (firstTag: string, name: string): number => {
  const release = RELEASE_TAG.exec(name)?.groups

  if (release?.["firstTag"] !== firstTag) {
    return 0
  }

  return Number(release["sequence"] ?? FIRST_SEQUENCE)
}

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
  const date = tag.replace(RELEASE_TAG, RELEASE_DATE)
  const day = changelog.days.find((section) => section.date === date)

  if (day === undefined) {
    return `See the [changelog](${CHANGELOG_URL}).`
  }

  return joinEntries(day.entries).replaceAll(SITE_LINK, `](${APP_URL}/`)
}
