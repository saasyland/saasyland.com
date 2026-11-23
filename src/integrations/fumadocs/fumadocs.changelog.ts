import type { Plugin } from "fumadocs-mdx"
import process from "node:process"
import * as zod from "zod"

import {
  type ChangelogEntry,
  type MergedEntry,
  RELEASE_TAG,
  joinEntries,
  originOf,
  readChangelog,
  unreleasedEntryProblems,
} from "../../lib/changelog"

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
const runSchema = zod.object({
  GITHUB_BASE_REF: zod.string().default(""),
  GITHUB_REF: zod.string().default(""),
  RELEASE_TAG: zod.string().regex(RELEASE_TAG).optional(),
})

const nonEmptyVariables = (variables: NodeJS.ProcessEnv): Record<string, string | undefined> =>
  Object.fromEntries(Object.entries(variables).filter(([, value]) => value !== ""))

const releaseProp = (release: string | undefined): string => (release === undefined ? "" : ` release="${release}"`)

const entryLinks = ({ key, release }: ChangelogEntry & Partial<Pick<MergedEntry, "release">>): string =>
  `<ChangelogLinks ${originOf(key)}="${key}"${releaseProp(release)} />`

const section = (heading: string, entries: readonly ChangelogEntry[]): string[] =>
  entries.length === 0 ? [] : [`## ${heading}`, joinEntries(entries, entryLinks)]

export const listChangelogEntries = async ({ cwd, path, source }: { cwd: string; path: string; source: string }): Promise<string> => {
  const element = ENTRIES_ELEMENT.exec(source)

  if (element === null) {
    return source
  }

  const { unreleased } = elementSchema.parse(element.groups)
  const { locale } = pageSchema.parse(PAGE_LOCALE.exec(path)?.groups)
  const { GITHUB_BASE_REF, GITHUB_REF, RELEASE_TAG: upcomingRelease } = runSchema.parse(nonEmptyVariables(process.env))
  const changelog = await readChangelog({ cwd, locale, upcomingRelease })
  const problems = unreleasedEntryProblems({ changelog, run: { baseRef: GITHUB_BASE_REF, ref: GITHUB_REF } })

  if (problems.length > 0) {
    throw new Error(problems.join("\n"))
  }

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
