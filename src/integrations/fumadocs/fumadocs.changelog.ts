import type { Plugin } from "fumadocs-mdx"
import zod from "zod/v4"

import { type ChangelogEntry, joinEntries, readChangelog } from "../../lib/changelog"

interface CompiledDocument {
  readonly cwd: string
  readonly path: string
  readonly toString: () => string
  value: string | Uint8Array
}

const ENTRIES_ELEMENT = /^<ChangelogEntries unreleased="(?<unreleased>[^"]+)" \/>$/mu
const PAGE_LOCALE = /\.(?<locale>[^./]+)\.mdx$/u
const SECTION_SEPARATOR = "\n\n"

const elementSchema = zod.object({ unreleased: zod.string() })
const pageSchema = zod.object({ locale: zod.string() })

const section = (heading: string, entries: readonly ChangelogEntry[]): string[] =>
  entries.length === 0 ? [] : [`## ${heading}`, joinEntries(entries)]

export const listChangelogEntries = async ({ cwd, path, source }: { cwd: string; path: string; source: string }): Promise<string> => {
  const element = ENTRIES_ELEMENT.exec(source)

  if (element === null) {
    return source
  }

  const { unreleased } = elementSchema.parse(element.groups)
  const { locale } = pageSchema.parse(PAGE_LOCALE.exec(path)?.groups)
  const changelog = await readChangelog({ cwd, locale })
  const sections = [...section(unreleased, changelog.unreleased), ...changelog.days.flatMap(({ date, entries }) => section(date, entries))]

  return source.replace(element[0], () => sections.join(SECTION_SEPARATOR))
}

export const addChangelogEntries = async (file: CompiledDocument): Promise<void> => {
  file.value = await listChangelogEntries({ cwd: file.cwd, path: file.path, source: file.toString() })
}

export const changelogEntries = {
  doc: { vfile: addChangelogEntries },
  name: "saasyland:changelog-entries",
} satisfies Plugin
