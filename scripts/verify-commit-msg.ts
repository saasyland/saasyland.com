import { readFileSync } from "node:fs"
import process from "node:process"

const FAILURE_EXIT_CODE = 1
const HOOK_ARGUMENTS_START = 2
const ATTRIBUTION_DOCS = "https://saasyland.com/docs/conventions/git-workflow#no-ai-attribution"

export const AI_TOOLS = [
  "aider",
  "anthropic",
  "chatgpt",
  "claude",
  "codex",
  "copilot",
  "cursor",
  "devin",
  "gemini",
  "openai",
  "openhands",
] as const

const AI_TOOL = new RegExp(String.raw`\b(?:${AI_TOOLS.join("|")})\b`, "iu")
const SCISSORS = /^# -+ >8 -+$/mu
const GIT_COMMENT = "#"
const TRAILER = /^[a-z][\w-]*-by:/iu
const GENERATED_LINE = /^\P{L}*generated with\b/iu

const isAttribution = (line: string): boolean => GENERATED_LINE.test(line) || (TRAILER.test(line) && AI_TOOL.test(line))

export const attributionProblems = (message: string): string[] => {
  const [body = ""] = message.split(SCISSORS)

  return body
    .split("\n")
    .flatMap((line, index) => (!line.startsWith(GIT_COMMENT) && isAttribution(line) ? [`line ${index + 1}: ${line.trim()}`] : []))
}

if (import.meta.main) {
  const [messageFile] = process.argv.slice(HOOK_ARGUMENTS_START)
  const problems = messageFile === undefined ? [] : attributionProblems(readFileSync(messageFile, "utf8"))

  if (problems.length > 0) {
    process.stderr.write(
      `\n❌  The commit message credits an AI tool, and commits carry no AI attribution:\n   ${problems.join("\n   ")}\n   Remove these lines and commit again. See ${ATTRIBUTION_DOCS}\n\n`,
    )
    process.exit(FAILURE_EXIT_CODE)
  }
}
