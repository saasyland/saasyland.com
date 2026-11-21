import { spawnSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import process from "node:process"
import postcss from "postcss"
import { parseSync } from "vite/rolldown/utils"

import { COMMENT_MESSAGES, commentMessageId } from "./code-style-lint-plugin.ts"

const FAILURE_EXIT_CODE = 1
const STYLE_EXTENSION = ".css"
const NOT_GENERATED = ":(attr:!linguist-generated)"

export const SOURCE_PATTERNS = ["*.cjs", "*.css", "*.cts", "*.js", "*.jsx", "*.mjs", "*.mts", "*.ts", "*.tsx"] as const

export interface SourceComment {
  readonly column: number
  readonly line: number
  readonly text: string
}

const positionAt = (source: string, offset: number): Omit<SourceComment, "text"> => ({
  column: offset - source.lastIndexOf("\n", offset - 1),
  line: source.slice(0, offset).split("\n").length,
})

const codeComments = (path: string, source: string): SourceComment[] => {
  const { comments, errors } = parseSync(path, source)

  if (errors.length > 0) {
    throw new Error(`${path} does not parse, so its comments cannot be read: ${errors.map(({ message }) => message).join("; ")}`)
  }

  return comments.map(({ start, value }) => {
    const { column, line } = positionAt(source, start)

    return { column, line, text: value }
  })
}

const styleComments = (path: string, source: string): SourceComment[] => {
  const comments: SourceComment[] = []

  postcss.parse(source, { from: path }).walkComments((comment) => {
    const { column, line } = comment.positionBy()

    comments.push({ column, line, text: comment.text })
  })

  return comments
}

export const commentsOf = (path: string, source: string): SourceComment[] =>
  path.endsWith(STYLE_EXTENSION) ? styleComments(path, source) : codeComments(path, source)

export const commentProblems = (path: string, source: string): string[] =>
  commentsOf(path, source).map(({ column, line, text }) => `${path}:${line}:${column}: ${COMMENT_MESSAGES[commentMessageId(text)]}`)

export const sourceFiles = (): string[] => {
  const { stdout } = spawnSync(
    "git",
    [
      "ls-files",
      "-z",
      "--cached",
      "--others",
      "--exclude-standard",
      "--deduplicate",
      "--",
      ...SOURCE_PATTERNS.map((pattern) => `${NOT_GENERATED}${pattern}`),
    ],
    { encoding: "utf8" },
  )

  return stdout.split("\0").filter((path) => path.length > 0 && existsSync(path))
}

if (import.meta.main) {
  const problems = sourceFiles().flatMap((path) => commentProblems(path, readFileSync(path, "utf8")))

  if (problems.length > 0) {
    console.error(problems.join("\n"))
    process.exit(FAILURE_EXIT_CODE)
  }
}
