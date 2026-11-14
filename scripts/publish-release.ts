import { $ } from "bun"
import { readFile } from "node:fs/promises"
import process from "node:process"
import { z } from "zod/v4"

import { CHANGELOG_FILE, releaseNotes, releaseTag } from "~/src/lib/release"

const SCRIPT_ARGUMENTS_START = 2
const TAG_REF_PREFIX = "refs/tags/"

const tagRefSchema = z.object({ object: z.object({ sha: z.string() }), ref: z.string() })

const [commit] = process.argv.slice(SCRIPT_ARGUMENTS_START)

if (commit === undefined) {
  throw new Error("Usage: bun scripts/publish-release.ts <deployed commit>")
}

const tagRefs = z.array(tagRefSchema).parse(await $`gh api repos/{owner}/{repo}/git/matching-refs/tags`.json())
const tags = tagRefs.map(({ object, ref }) => ({ commit: object.sha, name: ref.replace(TAG_REF_PREFIX, "") }))
const tag = releaseTag(commit, new Date(), tags)
const existing = await $`gh release view ${tag}`.nothrow().quiet()

if (existing.exitCode === 0) {
  process.stdout.write(`${tag} is already released.\n`)
} else {
  const notes = releaseNotes(await readFile(CHANGELOG_FILE, "utf8"), tag)

  await $`gh release create ${tag} --target ${commit} --notes-file - < ${new Response(notes)}`
}
