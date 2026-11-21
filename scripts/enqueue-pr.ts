import { execFileSync } from "node:child_process"
import process from "node:process"
import { z } from "zod/v4"

import { decoratedSubject, subjectProblems } from "./commit-msg.ts"

const SCRIPT_ARGUMENTS_START = 2
const FAILURE_EXIT_CODE = 1

const argumentsSchema = z.tuple([z.string().regex(/^[1-9]\d*$/u)])
const pullRequestSchema = z.object({ title: z.string() })

const gh = (args: readonly string[]): string => execFileSync("gh", args, { encoding: "utf8" }).trim()

export const squashTitle = (title: string): string => decoratedSubject(title.trim())

if (import.meta.main) {
  const [pullRequest] = argumentsSchema.parse(process.argv.slice(SCRIPT_ARGUMENTS_START))
  const { title } = pullRequestSchema.parse(JSON.parse(gh(["pr", "view", pullRequest, "--json", "title"])))
  const problems = subjectProblems(title.trim())

  if (problems.length > 0) {
    process.stderr.write(`Pull request #${pullRequest} needs a conventional title:\n${problems.join("\n")}\n`)
    process.exit(FAILURE_EXIT_CODE)
  }

  const subject = squashTitle(title)

  if (subject !== title) {
    gh(["pr", "edit", pullRequest, "--title", subject])
  }

  gh(["pr", "merge", pullRequest, "--auto", "--squash"])
  process.stdout.write(`#${pullRequest} lands on main as "${subject} (#${pullRequest})" once the merge queue's checks pass.\n`)
}
