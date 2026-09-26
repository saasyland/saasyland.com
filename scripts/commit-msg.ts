import { readFileSync, writeFileSync } from "node:fs"
import process from "node:process"

const FAILURE_EXIT_CODE = 1
const HOOK_ARGUMENTS_START = 2

const COMMIT_EMOJIS: Readonly<Record<string, string>> = {
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
const EMOJI_PRESENTATION = /^\p{Emoji_Presentation}/u
const GIT_GENERATED_SUBJECT = /^(?:Merge |Revert "|fixup! |squash! )/u
const TRAILING_NEWLINE = /\n?$/u

const SKIP_SOURCES = new Set(["squash", "merge", "template"])

const isSubjectLine = (line: string): boolean => line.trim().length > 0 && !line.trim().startsWith("#")

const fail = (lines: readonly string[]): never => {
  process.stderr.write(`\n❌  ${lines.join("\n   ")}\n\n`)

  return process.exit(FAILURE_EXIT_CODE)
}

const resolveEmoji = (subject: string): string => {
  const type = CONVENTIONAL_PATTERN.exec(subject)?.groups?.["type"]

  if (type === undefined) {
    return fail([
      "Commit message does not follow conventional format.",
      "Expected: <type>(<scope>): <description>",
      `Allowed types: ${ALLOWED_TYPES}`,
    ])
  }

  return COMMIT_EMOJIS[type] ?? fail([`Unknown commit type: "${type}"`, `Allowed types: ${ALLOWED_TYPES}`])
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

  if (EMOJI_PRESENTATION.test(subject) || GIT_GENERATED_SUBJECT.test(subject)) {
    return
  }

  const emoji = resolveEmoji(subject)

  writeFileSync(messageFile, lines.with(subjectIndex, `${emoji} ${subjectLine.trimEnd()}`).join("\n").replace(TRAILING_NEWLINE, "\n"))
}

try {
  run()
} catch (error) {
  fail([`Failed to process commit message: ${String(error)}`])
}
