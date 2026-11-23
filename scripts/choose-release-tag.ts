import process from "node:process"

import { readTags, releaseTag } from "~/src/lib/release"

import { scriptArguments } from "./run-command.ts"

const [commit] = scriptArguments()

if (commit === undefined) {
  throw new Error("Usage: bun scripts/choose-release-tag.ts <commit to deploy>")
}

const tags = readTags(process.cwd())

process.stdout.write(`tag=${releaseTag(commit, new Date(), tags)}\n`)
