import { readFileSync, writeFileSync } from "node:fs"
import process from "node:process"

const FAILURE_EXIT_CODE = 1
const HOOK_ARGUMENTS_START = 2

export const COMMIT_EMOJIS: Readonly<Record<string, string>> = {
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
}

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

const emojiFor = (subject: string): string | undefined => {
  const type = typeOf(subject)

  if (isDecorated(subject) || type === undefined) {
    return undefined
  }

  return COMMIT_EMOJIS[type]
}

export const subjectProblems = (subject: string): string[] => {
  const type = typeOf(subject)

  if (isDecorated(subject) || emojiFor(subject) !== undefined) {
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
  const emoji = emojiFor(subject)

  return emoji === undefined ? subject : `${emoji} ${subject}`
}

const run = (): void => {
  const [messageFile, source] = process.argv.slice(HOOK_ARGUMENTS_START)

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

  const emoji = emojiFor(subject)

  if (emoji === undefined) {
    return
  }

  writeFileSync(messageFile, lines.with(subjectIndex, `${emoji} ${subjectLine.trimEnd()}`).join("\n").replace(TRAILING_NEWLINE, "\n"))
}

if (import.meta.main) {
  try {
    run()
  } catch (error) {
    fail([`Failed to process commit message: ${String(error)}`])
  }
}
