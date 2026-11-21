import { $ } from "bun"
import process from "node:process"
import { z } from "zod/v4"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { RELEASE_TAG, readChangelog } from "~/src/lib/changelog"
import { releaseNotes } from "~/src/lib/release"

const SCRIPT_ARGUMENTS_START = 2

const argumentsSchema = z.tuple([z.string().min(1), z.string().regex(RELEASE_TAG)])

const [commit, tag] = argumentsSchema.parse(process.argv.slice(SCRIPT_ARGUMENTS_START))
const existing = await $`gh release view ${tag}`.nothrow().quiet()

if (existing.exitCode === 0) {
  process.stdout.write(`${tag} is already released.\n`)
} else {
  const changelog = await readChangelog({ cwd: process.cwd(), locale: I18N.DEFAULT_LOCALE, upcomingRelease: tag })
  const notes = releaseNotes(changelog, tag)

  await $`gh release create ${tag} --target ${commit} --notes-file - < ${new Response(notes)}`
}
