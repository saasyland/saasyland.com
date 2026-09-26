import { YAML } from "bun"
import { existsSync, readFileSync, readdirSync } from "node:fs"
import { join, relative } from "node:path"
import process from "node:process"
import { z } from "zod/v4"

import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

const FAILURE_EXIT_CODE = 1
const MIN_ENGLISH_PROSE_WORDS = 7

const CONTENT_DIR = join(import.meta.dirname, "../content")
const SOURCE_MDX_SUFFIX = `.${I18N.DEFAULT_LOCALE}.mdx`
const SOURCE_META_SUFFIX = `.${I18N.DEFAULT_LOCALE}.json`
const TRANSLATED_FIELDS = ["title", "description", "excerpt"]

const CODE_BLOCK_PATTERN = /^(?<fence>`{3,}|~{3,})[^\n]*\n[\s\S]*?^\k<fence>\s*$/gmu
const FRONTMATTER_PATTERN = /^---\r?\n(?<yaml>[\s\S]*?)\r?\n---/u
const TRANSLATION_MARKER_PATTERN = /ZXQ\d+QXZ|<ph\d+|▁|\{"translation":/u

const frontmatterSchema = z.record(z.string(), z.unknown())
const metaSchema = z.object({ pages: z.array(z.string()).optional() })

interface Translation {
  readonly label: string
  readonly locale: SupportedLocale
  readonly source: string
  readonly target: string
}

const listFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? listFiles(join(directory, entry.name)) : [join(directory, entry.name)],
  )

const codeBlocks = (source: string): string[] =>
  [...source.matchAll(CODE_BLOCK_PATTERN)]
    .map(([code]) => code)
    .filter((code) => !code.startsWith("```markdown"))
    .map((code) => code.replaceAll(/^\s*\/\/[^\n]*$/gmu, ""))

const readFrontmatter = (source: string): Record<string, unknown> => {
  const yaml = FRONTMATTER_PATTERN.exec(source)?.groups?.["yaml"]

  if (yaml === undefined || yaml.length === 0) {
    throw new Error("Missing MDX frontmatter")
  }

  return frontmatterSchema.parse(YAML.parse(yaml))
}

const isEnglishProse = (text: string): boolean =>
  (text.match(/\p{L}+/gu)?.length ?? 0) >= MIN_ENGLISH_PROSE_WORDS &&
  /\b(?:the|your|you|this|that|with|from|for|and|will|our|how)\b/iu.test(text)

const proseParagraphs = (source: string): string[] =>
  source
    .replace(FRONTMATTER_PATTERN, "")
    .replaceAll(CODE_BLOCK_PATTERN, "")
    .split(/\n\s*\n/u)
    .map((paragraph) => paragraph.trim().replaceAll(/\s+/gu, " "))
    .filter((paragraph) => !/^(?:import |export |<)/u.test(paragraph) && isEnglishProse(paragraph))

const mdxProblems = ({ label, locale, source, target }: Translation): string[] => {
  const problems: string[] = []
  const metadata = readFrontmatter(target)

  if (typeof metadata["title"] !== "string" || metadata["title"].trim().length === 0) {
    problems.push(`Missing title in ${label}`)
  }

  if (JSON.stringify(codeBlocks(source)) !== JSON.stringify(codeBlocks(target))) {
    problems.push(`Changed code examples in ${label}`)
  }

  if (TRANSLATION_MARKER_PATTERN.test(target)) {
    problems.push(`Unresolved translation marker in ${label}`)
  }

  if (locale === I18N.DEFAULT_LOCALE) {
    return problems
  }

  const translatedParagraphs = new Set(proseParagraphs(target))

  if (proseParagraphs(source).some((paragraph) => translatedParagraphs.has(paragraph))) {
    problems.push(`Untranslated English paragraph in ${label}`)
  }

  const sourceMetadata = readFrontmatter(source)

  for (const field of TRANSLATED_FIELDS) {
    const original = sourceMetadata[field]

    if (typeof original === "string" && isEnglishProse(original) && metadata[field] === original) {
      problems.push(`Untranslated ${field} in ${label}`)
    }
  }

  return problems
}

const metaProblems = ({ label, source, target }: Translation): string[] => {
  const sourcePages = metaSchema.parse(JSON.parse(source)).pages
  const targetPages = metaSchema.parse(JSON.parse(target)).pages

  return JSON.stringify(sourcePages) === JSON.stringify(targetPages) ? [] : [`Changed navigation slugs in ${label}`]
}

const translationProblems = ({ locale, source, sourcePath }: { locale: SupportedLocale; source: string; sourcePath: string }): string[] => {
  const isMdx = sourcePath.endsWith(SOURCE_MDX_SUFFIX)
  const suffix = isMdx ? SOURCE_MDX_SUFFIX : SOURCE_META_SUFFIX
  const targetPath = `${sourcePath.slice(0, -suffix.length)}.${locale}.${isMdx ? "mdx" : "json"}`
  const label = relative(CONTENT_DIR, targetPath)

  if (!existsSync(targetPath)) {
    return [`Missing ${label}`]
  }

  const translation = { label, locale, source, target: readFileSync(targetPath, "utf8") }

  return isMdx ? mdxProblems(translation) : metaProblems(translation)
}

const problems = listFiles(CONTENT_DIR)
  .filter((path) => path.endsWith(SOURCE_MDX_SUFFIX) || path.endsWith(SOURCE_META_SUFFIX))
  .flatMap((sourcePath) => {
    const source = readFileSync(sourcePath, "utf8")

    return I18N.SUPPORTED_LOCALES.flatMap((locale) => translationProblems({ locale, source, sourcePath }))
  })

if (problems.length > 0) {
  console.error(problems.join("\n"))
  process.exit(FAILURE_EXIT_CODE)
}

console.log(`✅ Content files, navigation, and code examples match across ${I18N.SUPPORTED_LOCALES.length} locales.`)
