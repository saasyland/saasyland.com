import process from "node:process"

import { readTags, releaseTag } from "~/src/lib/release"

const SCRIPT_ARGUMENTS_START = 2

const [commit] = process.argv.slice(SCRIPT_ARGUMENTS_START)

if (commit === undefined) {
  throw new Error("Usage: bun scripts/choose-release-tag.ts <commit to deploy>")
}

const tags = readTags(process.cwd())

process.stdout.write(`tag=${releaseTag(commit, new Date(), tags)}\n`)
