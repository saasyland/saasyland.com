import { readFileSync } from "node:fs"
import { describe, expect, it } from "vite-plus/test"

import { attributionProblems } from "~/scripts/verify-commit-msg"

const SUBJECT = "fix(auth): keep the locale in verification links"
const BODY = "The verification link now carries the locale the user signed up in."
const CLAUDE_TRAILER = "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
const GENERATED_LINE = "🤖 Generated with [Claude Code](https://claude.com/claude-code)"
const SCISSORS = "# ------------------------ >8 ------------------------"

const message = (...lines: readonly string[]): string => [SUBJECT, "", ...lines, ""].join("\n")

describe("attributionProblems", () => {
  it("accepts a conventional message with a body", () => {
    expect(attributionProblems(message(BODY))).toStrictEqual([])
  })

  it("names the line of a Co-Authored-By trailer for Claude", () => {
    expect(attributionProblems(message(BODY, "", CLAUDE_TRAILER))).toStrictEqual([`line 5: ${CLAUDE_TRAILER}`])
  })

  it("names a trailer for another AI tool, in any casing and under any -by key", () => {
    const trailers = [
      "Co-authored-by: Copilot <175728472+Copilot@users.noreply.github.com>",
      "co-authored-by: Cursor Agent <cursoragent@cursor.com>",
      "Assisted-by: OpenAI Codex",
      "Signed-off-by: Gemini <gemini@example.com>",
    ]

    expect(attributionProblems(message(...trailers))).toStrictEqual(trailers.map((trailer, index) => `line ${index + 3}: ${trailer}`))
  })

  it("names a Generated with line", () => {
    expect(attributionProblems(message(BODY, "", GENERATED_LINE, "Generated with Cursor"))).toStrictEqual([
      `line 5: ${GENERATED_LINE}`,
      "line 6: Generated with Cursor",
    ])
  })

  it("accepts a person as a co-author and a body that mentions a tool in passing", () => {
    expect(
      attributionProblems(message("Claude Code users reported the broken link.", "", "Co-authored-by: Jane Doe <jane@example.com>")),
    ).toStrictEqual([])
  })

  it("ignores the lines Git strips: comments and the diff below the scissors line", () => {
    expect(attributionProblems(message(BODY, `# ${CLAUDE_TRAILER}`, SCISSORS, CLAUDE_TRAILER, GENERATED_LINE))).toStrictEqual([])
  })

  it("runs as the commit-msg hook on the message Git is about to record", () => {
    expect(readFileSync(".vite-hooks/commit-msg", "utf8")).toBe('bun scripts/verify-commit-msg.ts "$1"\n')
  })
})
