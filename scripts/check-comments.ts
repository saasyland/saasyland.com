import { spawnSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import process from "node:process"
import postcss from "postcss"
import { parseSync } from "vite/rolldown/utils"
import { Parser } from "yaml"
import * as zod from "zod"

import { COMMENT_MESSAGES, type CommentSpan, commentMessageId, isLinkComment } from "./code-style-lint-plugin.ts"
import { FAILURE_EXIT_CODE } from "./run-command.ts"

const STYLE_EXTENSION = ".css"
const YAML_EXTENSION = /\.ya?ml$/u
const NOT_GENERATED = ":(attr:!linguist-generated)"
const PINNED_ACTION = /^ *(?:- )?uses: [\w.-]+\/[\w./-]+@[\da-f]{40} # v\d+(?:\.\d+){0,2}$/u

export const YAML_COMMENT_MESSAGE =
  "Remove this comment. A workflow takes one comment only, the version tag of an action pinned to a commit, as in uses: owner/repo@<40-character SHA> # v4."

export const SOURCE_PATTERNS = ["*.cjs", "*.css", "*.cts", "*.js", "*.jsx", "*.mjs", "*.mts", "*.ts", "*.tsx", "*.yaml", "*.yml"] as const

export interface SourceComment extends CommentSpan {
  readonly column: number
}

const YAML_COMMENT = zod.object({ offset: zod.number(), source: zod.string(), type: zod.literal("comment") })

const YAML_CHILDREN = zod.union([
  zod.array(zod.unknown()),
  zod.record(zod.string(), zod.unknown()).transform((token) => Object.values(token)),
])

const positionAt = (source: string, offset: number): Pick<SourceComment, "column" | "line"> => ({
  column: offset - source.lastIndexOf("\n", offset - 1),
  line: source.slice(0, offset).split("\n").length,
})

const codeComments = (path: string, source: string): SourceComment[] => {
  const { comments, errors } = parseSync(path, source)

  if (errors.length > 0) {
    throw new Error(`${path} does not parse, so its comments cannot be read: ${errors.map(({ message }) => message).join("; ")}`)
  }

  return comments.map(({ end, start, value }) => {
    const { column, line } = positionAt(source, start)

    return { column, endLine: positionAt(source, end).line, line, text: value }
  })
}

const styleComments = (path: string, source: string): SourceComment[] => {
  const comments: SourceComment[] = []

  postcss.parse(source, { from: path }).walkComments((comment) => {
    const { end, start } = comment.rangeBy({})

    comments.push({ column: start.column, endLine: end.line, line: start.line, text: comment.text })
  })

  return comments
}

const yamlTokens = (token: unknown): zod.infer<typeof YAML_COMMENT>[] => {
  const comment = YAML_COMMENT.safeParse(token)

  if (comment.success) {
    return [comment.data]
  }

  const children = YAML_CHILDREN.safeParse(token)

  return children.success ? children.data.flatMap(yamlTokens) : []
}

const yamlComments = (source: string): SourceComment[] =>
  yamlTokens([...new Parser().parse(source)]).map(({ offset, source: text }) => {
    const { column, line } = positionAt(source, offset)

    return { column, endLine: line, line, text }
  })

export const commentsOf = (path: string, source: string): SourceComment[] => {
  if (YAML_EXTENSION.test(path)) {
    return yamlComments(source)
  }

  return path.endsWith(STYLE_EXTENSION) ? styleComments(path, source) : codeComments(path, source)
}

const pinnedActionLines = (source: string): Set<number> =>
  new Set(source.split("\n").flatMap((text, index) => (PINNED_ACTION.test(text) ? [index + 1] : [])))

const codeProblem = (comment: SourceComment, comments: readonly SourceComment[]): string[] =>
  isLinkComment(comment, comments) ? [] : [COMMENT_MESSAGES[commentMessageId(comment.text)]]

export const commentProblems = (path: string, source: string): string[] => {
  const comments = commentsOf(path, source)
  const pinned = pinnedActionLines(source)
  const problemOf = (comment: SourceComment): string[] => {
    if (YAML_EXTENSION.test(path)) {
      return pinned.has(comment.line) ? [] : [YAML_COMMENT_MESSAGE]
    }

    return codeProblem(comment, comments)
  }

  return comments.flatMap((comment) => problemOf(comment).map((message) => `${path}:${comment.line}:${comment.column}: ${message}`))
}

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
