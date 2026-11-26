import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import process from "node:process"

import {
  type CopyProblem,
  courseFileProblems,
  formatCopyProblem,
  mdxFileProblems,
  messageFileProblems,
  metaFileProblems,
} from "~/src/lib/glossary-copy"
import { GLOSSARIES, type Glossary } from "~/src/lib/glossary-terms"

import { FAILURE_EXIT_CODE } from "./run-command.ts"

const REPOSITORY_DIR = join(import.meta.dirname, "..")
const CONTENT_DIR = "content"
const COURSES_DIR = join(CONTENT_DIR, "courses")
const JSON_EXTENSION = ".json"

const filesIn = (directory: string): string[] =>
  readdirSync(join(REPOSITORY_DIR, directory), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name).slice(REPOSITORY_DIR.length + 1))

const CONTENT_FILES = filesIn(CONTENT_DIR)

const sources = ({
  locale,
}: Glossary): readonly (readonly [files: readonly string[], problems: (glossary: Glossary, source: string) => CopyProblem[]])[] => [
  [filesIn(join("messages", locale)).filter((file) => file.endsWith(JSON_EXTENSION)), messageFileProblems],
  [CONTENT_FILES.filter((file) => file.endsWith(`.${locale}.mdx`)), mdxFileProblems],
  [CONTENT_FILES.filter((file) => file.endsWith(`.${locale}${JSON_EXTENSION}`)), metaFileProblems],
  [filesIn(COURSES_DIR).filter((file) => file.endsWith(JSON_EXTENSION)), courseFileProblems],
]

const problems = GLOSSARIES.flatMap((glossary) =>
  sources(glossary).flatMap(([files, problemsOf]) =>
    files
      .toSorted()
      .flatMap((file) =>
        problemsOf(glossary, readFileSync(join(REPOSITORY_DIR, file), "utf8")).map((problem) => formatCopyProblem(glossary, file, problem)),
      ),
  ),
)

if (problems.length > 0) {
  console.error(problems.join("\n"))
  console.error(
    `\n${String(problems.length)} terms that a glossary in src/data/ never allows for their locale. Write the term the glossary prefers.`,
  )
  process.exit(FAILURE_EXIT_CODE)
}

const LANGUAGES = new Intl.ListFormat("en-US").format(GLOSSARIES.map(({ language }) => language))

console.log(`✅ ${LANGUAGES} copy uses no term that its glossary never allows.`)
