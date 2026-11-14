import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { APP_URL } from "~/src/presentation/branding"
import { ROUTES } from "~/src/routes"

interface GitTag {
  readonly commit: string
  readonly name: string
}

const CHANGELOG_PAGE = "project/changelog"
const CHANGELOG_URL = `${APP_URL}${ROUTES.DOCS}/${CHANGELOG_PAGE}`

export const CHANGELOG_FILE = `content/docs/${CHANGELOG_PAGE}.${I18N.DEFAULT_LOCALE}.mdx`

const UTC_TIMESTAMP = /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})T.+$/u
const RELEASE_TAG = /^(?<firstTag>v(?<year>\d{4})\.(?<month>\d{2})\.(?<day>\d{2}))(?:\.(?<sequence>\d+))?$/u
const FIRST_TAG = "v$<year>.$<month>.$<day>"
const CHANGELOG_HEADING = "## $<year>-$<month>-$<day>\n"
const SECTION_START = /^(?=## )/mu
const SITE_LINK = "](/"

const FIRST_SEQUENCE = 1
const STEP = 1

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
  const next = tags.reduce((latest, { name }) => Math.max(latest, sequenceOn(firstTag, name)), 0) + STEP

  return next === FIRST_SEQUENCE ? firstTag : `${firstTag}.${String(next)}`
}

export const releaseNotes = (changelog: string, tag: string): string => {
  const heading = tag.replace(RELEASE_TAG, CHANGELOG_HEADING)
  const section = changelog.split(SECTION_START).find((part) => part.startsWith(heading))
  const notes = section?.slice(heading.length).trim() ?? ""

  if (notes.length === 0) {
    return `See the [changelog](${CHANGELOG_URL}).`
  }

  return notes.replaceAll(SITE_LINK, `](${APP_URL}/`)
}
