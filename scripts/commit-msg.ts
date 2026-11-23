import { readFileSync, writeFileSync } from "node:fs"
import process from "node:process"

import { FAILURE_EXIT_CODE, scriptArguments } from "./run-command.ts"

export const COMMIT_EMOJIS = {
  build: "🛠️",
  chore: "♻️",
  ci: "⚙️",
  docs: "📚",
  feat: "✨",
  fix: "🐛",
  perf: "🚀",
  refactor: "📦",
  revert: "🗑️",
  style: "💎",
  test: "🚨",
} as const

type CommitType = keyof typeof COMMIT_EMOJIS

const ALLOWED_TYPES = Object.keys(COMMIT_EMOJIS).join(", ")

const CONVENTIONAL_PATTERN = /^(?<type>[a-z]+)(?:\([^)]*\))?!?:\s/u
const LEADING_EMOJI = /^\p{Extended_Pictographic}/u
const GIT_GENERATED_SUBJECT = /^(?:Merge |Revert "|fixup! |squash! )/u
const TRAILING_NEWLINE = /\n?$/u

const SKIP_SOURCES = new Set(["squash", "merge", "template"])

const isSubjectLine = (line: string): boolean => line.trim().length > 0 && !line.trim().startsWith("#")

const fail = (lines: readonly string[]): never => {
  process.stderr.write(`\n❌  ${lines.join("\n   ")}\n\n`)

  return process.exit(FAILURE_EXIT_CODE)
}

const isDecorated = (subject: string): boolean => LEADING_EMOJI.test(subject) || GIT_GENERATED_SUBJECT.test(subject)

const typeOf = (subject: string): string | undefined => CONVENTIONAL_PATTERN.exec(subject)?.groups?.["type"]

const isCommitType = (type: string | undefined): type is CommitType => type !== undefined && Object.hasOwn(COMMIT_EMOJIS, type)

export const subjectProblems = (subject: string): string[] => {
  const type = typeOf(subject)

  if (isDecorated(subject) || isCommitType(type)) {
    return []
  }

  if (type === undefined) {
    return [
      "Commit message does not follow conventional format.",
      "Expected: <type>(<scope>): <description>",
      `Allowed types: ${ALLOWED_TYPES}`,
    ]
  }

  return [`Unknown commit type: "${type}"`, `Allowed types: ${ALLOWED_TYPES}`]
}

export const decoratedSubject = (subject: string): string => {
  const type = typeOf(subject)

  return isCommitType(type) ? `${COMMIT_EMOJIS[type]} ${subject}` : subject
}

const run = (): void => {
  const [messageFile, source] = scriptArguments()

  if (messageFile === undefined || (source !== undefined && SKIP_SOURCES.has(source))) {
    return
  }

  const lines = readFileSync(messageFile, "utf8").split("\n")
  const subjectIndex = lines.findIndex((line) => isSubjectLine(line))
  const subjectLine = lines[subjectIndex]

  if (subjectLine === undefined) {
    return
  }

  const subject = subjectLine.trim()
  const problems = subjectProblems(subject)

  if (problems.length > 0) {
    fail(problems)
  }

  const type = typeOf(subject)

  if (!isCommitType(type)) {
    return
  }

  writeFileSync(
    messageFile,
    lines.with(subjectIndex, `${COMMIT_EMOJIS[type]} ${subjectLine.trimEnd()}`).join("\n").replace(TRAILING_NEWLINE, "\n"),
  )
}

if (import.meta.main) {
  try {
    run()
  } catch (error) {
    fail([`Failed to process commit message: ${String(error)}`])
  }
}
