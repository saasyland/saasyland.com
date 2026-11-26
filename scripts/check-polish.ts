import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import process from "node:process"

import {
  POLISH_LOCALE,
  type PolishCopyProblem,
  courseFileProblems,
  formatPolishCopyProblem,
  mdxFileProblems,
  messageFileProblems,
  metaFileProblems,
} from "~/src/lib/polish-copy"

import { FAILURE_EXIT_CODE } from "./run-command.ts"

const REPOSITORY_DIR = join(import.meta.dirname, "..")
const MESSAGES_DIR = join("messages", POLISH_LOCALE)
const CONTENT_DIR = "content"
const COURSES_DIR = join(CONTENT_DIR, "courses")
const JSON_EXTENSION = ".json"

const filesIn = (directory: string): string[] =>
  readdirSync(join(REPOSITORY_DIR, directory), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name).slice(REPOSITORY_DIR.length + 1))

const SOURCES: readonly (readonly [files: readonly string[], problems: (source: string) => PolishCopyProblem[]])[] = [
  [filesIn(MESSAGES_DIR).filter((file) => file.endsWith(JSON_EXTENSION)), messageFileProblems],
  [filesIn(CONTENT_DIR).filter((file) => file.endsWith(`.${POLISH_LOCALE}.mdx`)), mdxFileProblems],
  [filesIn(CONTENT_DIR).filter((file) => file.endsWith(`.${POLISH_LOCALE}${JSON_EXTENSION}`)), metaFileProblems],
  [filesIn(COURSES_DIR).filter((file) => file.endsWith(JSON_EXTENSION)), courseFileProblems],
]

const problems = SOURCES.flatMap(([files, problemsOf]) =>
  files
    .toSorted()
    .flatMap((file) =>
      problemsOf(readFileSync(join(REPOSITORY_DIR, file), "utf8")).map((problem) => formatPolishCopyProblem(file, problem)),
    ),
)

if (problems.length > 0) {
  console.error(problems.join("\n"))
  console.error(
    `\n${String(problems.length)} Polish terms that src/data/polish-glossary.ts never allows. Write the term the glossary prefers.`,
  )
  process.exit(FAILURE_EXIT_CODE)
}

console.log("✅ Polish copy uses no term that the glossary never allows.")
