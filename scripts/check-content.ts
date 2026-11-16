import { frontmatter } from "fumadocs-core/content/md/frontmatter"
import { existsSync, readFileSync, readdirSync } from "node:fs"
import { join, relative } from "node:path"
import process from "node:process"
import { z } from "zod/v4"

import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { canonicalizePathname, deLocalizePathname } from "~/src/integrations/use-intl/i18n.paths"

import { ENVIRONMENT, appHostsForMode } from "~/src/modules/_core/constants/api"

import { CHANGELOG_DIRECTORY, ENTRY_KEY, pullRequestOf } from "~/src/lib/changelog"

import { readWranglerEnvironment } from "./wrangler-config"
import { APP_DOMAIN } from "~/src/presentation/branding"
import { ROUTES } from "~/src/routes"

const FAILURE_EXIT_CODE = 1
const MIN_ENGLISH_PROSE_WORDS = 7

const REPOSITORY_DIR = join(import.meta.dirname, "..")
const CONTENT_DIR = join(REPOSITORY_DIR, "content")
const SOURCE_MDX_SUFFIX = `.${I18N.DEFAULT_LOCALE}.mdx`
const SOURCE_META_SUFFIX = `.${I18N.DEFAULT_LOCALE}.json`
const TRANSLATED_FIELDS = ["title", "description", "excerpt", "unreleased"]
const CHANGELOG_PREFIX = `${relative(CONTENT_DIR, join(REPOSITORY_DIR, CHANGELOG_DIRECTORY))}/`

const CODE_BLOCK_PATTERN = /^(?<fence>`{3,}|~{3,})[^\n]*\n[\s\S]*?^\k<fence>\s*$/gmu
const TRANSLATION_MARKER_PATTERN = /ZXQ\d+QXZ|<ph\d+|▁|\{"translation":/u
const QUOTED_SOURCE_PATTERN = /^(?<fence>`{3,})[^\n]*\btitle="(?<path>[^"]+)"[^\n]*\n(?<code>[\s\S]*?)^\k<fence>\s*$/gmu
const TABLE_ROW_PATTERN = /^\|(?<cells>.*)\|[ \t]*$/gmu
const INLINE_CODE_PATTERN = /`(?<code>[^`\n]+)`/gu
const COMPONENT_PATTERN = /<(?<name>[A-Z][A-Za-z]*)(?<props>(?:\s+[A-Za-z-]+(?:=(?:"[^"]*"|\{[^}]*\}))?)*)\s*\/?>/gu
const STRING_PROP_PATTERN = /(?<name>[A-Za-z-]+)="[^"]*"/gu
const LINK_PATTERN = /\]\((?<href>[^)#\s]+)/gu
const BARE_URL_PATTERN = /(?<!\]\()(?<!["'=[])https?:\/\/[^\s<]+/gu
const NON_ASCII_PATTERN = /\P{ASCII}/u
const INTERNAL_LINK_PATTERN = /(?:\]\(|\bhref=")(?<path>\/(?!\/)[^)"\s?#]*)/gu
const REDIRECTED_ENDING_PATTERN = /(?:\/index)?(?:\.html)?\/?$/u
const HOST_PATTERN = /\b(?:[a-z0-9-]+\.)+[a-z]{2,}(?::\d+)?\b|\b(?:localhost|127\.0\.0\.1):\d+\b/gu
const LOCAL_HOST_PATTERN = /^(?:localhost|127\.0\.0\.1):/u
const ENVIRONMENT_VARIABLE_PATTERN = /^[A-Z][A-Z0-9_]+$/u
const ROUTE_CONSTANT_PATTERN = /^[A-Z][A-Z_]+$/u
const ROUTES_PREFIX = /^ROUTES\./u
const ROUTE_WILDCARD = "/*"
const DOCS_PREFIX = "docs/"

const frontmatterSchema = z.record(z.string(), z.unknown())
const packageSchema = z.object({ scripts: z.record(z.string(), z.string()) })
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
  [...source.matchAll(CODE_BLOCK_PATTERN)].map(([code]) => code.replaceAll(/^\s*\/\/[^\n]*$/gmu, ""))

const readFrontmatter = (source: string): Record<string, unknown> => {
  const { data, matter } = frontmatter(source)

  if (matter.length === 0) {
    throw new Error("Missing MDX frontmatter")
  }

  return frontmatterSchema.parse(data)
}

const proseOf = (source: string): string => frontmatter(source).content.replaceAll(CODE_BLOCK_PATTERN, "")

const isEnglishProse = (text: string): boolean =>
  (text.match(/\p{L}+/gu)?.length ?? 0) >= MIN_ENGLISH_PROSE_WORDS &&
  /\b(?:the|your|you|this|that|with|from|for|and|will|our|how)\b/iu.test(text)

const proseParagraphs = (source: string): string[] =>
  proseOf(source)
    .split(/\n\s*\n/u)
    .map((paragraph) => paragraph.trim().replaceAll(/\s+/gu, " "))
    .filter((paragraph) => !/^(?:import |export |<)/u.test(paragraph) && isEnglishProse(paragraph))

const wranglerEnvironments = await Promise.all(Object.values(ENVIRONMENT).map((environment) => readWranglerEnvironment(environment)))
const workerSecrets = new Set(wranglerEnvironments.flatMap(({ secrets }) => secrets.required))
const workerVariables = new Set([...workerSecrets, ...wranglerEnvironments.flatMap(({ vars }) => Object.keys(vars ?? {}))])
const packageManifest: unknown = JSON.parse(readFileSync(join(REPOSITORY_DIR, "package.json"), "utf8"))
const packageScripts = new Set(Object.keys(packageSchema.parse(packageManifest).scripts))
const appHosts = new Set(Object.values(ENVIRONMENT).flatMap((mode) => appHostsForMode(mode)))
const routePaths: Readonly<Record<string, unknown>> = ROUTES

const inlineCode = (text: string): string[] => [...text.matchAll(INLINE_CODE_PATTERN)].flatMap(({ groups }) => groups?.["code"] ?? [])

const proseWithoutCode = (source: string): string => proseOf(source).replaceAll(INLINE_CODE_PATTERN, "")

const untranslatedProps = (props: string): string[] =>
  [...props.matchAll(STRING_PROP_PATTERN)]
    .filter(({ groups }) => !TRANSLATED_FIELDS.includes(groups?.["name"] ?? ""))
    .map(([prop]) => prop)
    .toSorted()

const componentsOf = (source: string): string[] =>
  [...proseWithoutCode(source).matchAll(COMPONENT_PATTERN)].map(
    ({ groups }) => `<${[groups?.["name"] ?? "", ...untranslatedProps(groups?.["props"] ?? "")].join(" ")}>`,
  )

const linksOf = (source: string): string[] =>
  [...proseWithoutCode(source).matchAll(LINK_PATTERN)].flatMap(({ groups }) => groups?.["href"] ?? [])

const canonicalPath = (path: string): string => deLocalizePathname(canonicalizePathname(path.replace(REDIRECTED_ENDING_PATTERN, "") || "/"))

const linkProblems = ({ label, target }: Translation): string[] => {
  const paths = new Set([...proseWithoutCode(target).matchAll(INTERNAL_LINK_PATTERN)].flatMap(({ groups }) => groups?.["path"] ?? []))

  return [...paths]
    .filter((path) => canonicalPath(path) !== path)
    .map(
      (path) =>
        `${label} links to ${path} instead of ${canonicalPath(path)}, which the site serves without a redirect in the reader's locale`,
    )
}

const inlineCodeOf = (source: string): string[] => inlineCode(proseOf(source)).map((code) => `\`${code}\``)

const bareUrlProblems = ({ label, target }: Translation): string[] =>
  (proseWithoutCode(target).match(BARE_URL_PATTERN) ?? [])
    .filter((url) => NON_ASCII_PATTERN.test(url))
    .map((url) => `${label} has a bare URL that runs into the text after it, so the link takes that text too: ${url}`)

const tableRows = (source: string): string[][] =>
  [...source.matchAll(TABLE_ROW_PATTERN)].map(({ groups }) => (groups?.["cells"] ?? "").split("|").map((cell) => cell.trim()))

const firstColumnCode = (source: string): Set<string> => new Set(tableRows(source).flatMap(([firstCell = ""]) => inlineCode(firstCell)))

const undocumented = ({ documented, expected, label }: { documented: Set<string>; expected: Set<string>; label: string }): string[] =>
  [...expected].filter((name) => !documented.has(name)).map((name) => `${label} does not list ${name}`)

const quotedSourceProblems = ({ label, target }: Translation): string[] =>
  [...target.matchAll(QUOTED_SOURCE_PATTERN)].flatMap(({ groups }) => {
    const path = groups?.["path"] ?? ""
    const file = join(REPOSITORY_DIR, path)

    return existsSync(file) && readFileSync(file, "utf8").includes(groups?.["code"] ?? "")
      ? []
      : [`A code block in ${label} is not an excerpt of ${path}`]
  })

const hostProblems = ({ label, target }: Translation): string[] =>
  [...new Set(target.match(HOST_PATTERN))]
    .filter((host) => (LOCAL_HOST_PATTERN.test(host) || host.endsWith(`.${APP_DOMAIN}`)) && !appHosts.has(host))
    .map((host) => `${label} names ${host}, which appHostsForMode allows in no mode`)

const routeProblems = ({ label, target }: Translation): string[] => [
  ...tableRows(target).flatMap(([pathCell = "", constantCell = ""]) => {
    const [path] = inlineCode(pathCell)
    const [constant = ""] = inlineCode(constantCell)
    const route = routePaths[constant]

    if (!ROUTE_CONSTANT_PATTERN.test(constant) || typeof route !== "string" || [route, `${route}${ROUTE_WILDCARD}`].includes(path ?? "")) {
      return []
    }

    return [`${label} lists ${String(path)} for ROUTES.${constant}, which is ${route}`]
  }),
  ...undocumented({
    documented: new Set(inlineCode(target).map((code) => code.replace(ROUTES_PREFIX, ""))),
    expected: new Set(Object.keys(ROUTES)),
    label,
  }),
]

const scriptProblems = ({ label, target }: Translation): string[] => {
  const documented = firstColumnCode(target)

  return [
    ...undocumented({ documented, expected: packageScripts, label }),
    ...[...documented]
      .filter((script) => !packageScripts.has(script))
      .map((script) => `${label} lists ${script}, which package.json does not define`),
  ]
}

const documentedVariables = (target: string): Set<string> =>
  new Set([...firstColumnCode(target)].filter((code) => ENVIRONMENT_VARIABLE_PATTERN.test(code)))

const secretProblems = ({ label, target }: Translation): string[] => {
  const documented = documentedVariables(target)

  return [
    ...undocumented({ documented, expected: workerSecrets, label }),
    ...[...documented]
      .filter((name) => !workerSecrets.has(name))
      .map((name) => `${label} lists ${name}, which no environment requires as a secret`),
  ]
}

const variableProblems = ({ label, target }: Translation): string[] =>
  undocumented({ documented: documentedVariables(target), expected: workerVariables, label })

const changedItems = ({ items, label, source, target }: Translation & { items: (text: string) => string[] }): string[] => {
  const expected = new Set(items(source))
  const found = new Set(items(target))

  return [
    ...[...expected].filter((item) => !found.has(item)).map((item) => `${label} leaves out ${item} from the English page`),
    ...[...found].filter((item) => !expected.has(item)).map((item) => `${label} adds ${item}, which the English page does not have`),
  ]
}

const tableRowProblems = ({ label, source, target }: Translation): string[] => {
  const expected = tableRows(source).length
  const found = tableRows(target).length

  return found === expected ? [] : [`${label} has ${String(found)} table rows where the English page has ${String(expected)}`]
}

const structureProblems = (translation: Translation): string[] => [
  ...[inlineCodeOf, componentsOf, linksOf].flatMap((items) => changedItems({ ...translation, items })),
  ...tableRowProblems(translation),
]

const DOCS_PAGE_CHECKS: Readonly<Record<string, (translation: Translation) => string[]>> = {
  "docs/getting-started/environment-variables": secretProblems,
  "docs/reference/environment": variableProblems,
  "docs/reference/routes": routeProblems,
  "docs/tooling/scripts": scriptProblems,
}

const codeValueProblems = (translation: Translation): string[] => {
  const page = translation.label.slice(0, -`.${translation.locale}.mdx`.length)

  if (!page.startsWith(DOCS_PREFIX)) {
    return quotedSourceProblems(translation)
  }

  return [...quotedSourceProblems(translation), ...hostProblems(translation), ...(DOCS_PAGE_CHECKS[page]?.(translation) ?? [])]
}

const untranslatedParagraphProblems = ({ label, source, target }: Translation): string[] => {
  const translatedParagraphs = new Set(proseParagraphs(target))
  const untranslated = proseParagraphs(source).some((paragraph) => translatedParagraphs.has(paragraph))

  return untranslated ? [`Untranslated English paragraph in ${label}`] : []
}

const untranslatedFieldProblems = ({ label, source, target }: Translation): string[] => {
  const sourceMetadata = readFrontmatter(source)
  const metadata = readFrontmatter(target)

  return TRANSLATED_FIELDS.filter((field) => {
    const original = sourceMetadata[field]

    return typeof original === "string" && isEnglishProse(original) && metadata[field] === original
  }).map((field) => `Untranslated ${field} in ${label}`)
}

const titleProblems = ({ label, target }: Translation): string[] => {
  const { title } = readFrontmatter(target)

  return typeof title === "string" && title.trim().length > 0 ? [] : [`Missing title in ${label}`]
}

const entryKeyProblems = ({ label, locale }: Translation): string[] => {
  const key = label.slice(CHANGELOG_PREFIX.length, -`.${locale}.mdx`.length)

  return ENTRY_KEY.test(key) ? [] : [`${label} is named after neither a pull request number nor a full commit hash`]
}

export const mdxProblems = (translation: Translation): string[] => {
  const { label, locale, source, target } = translation
  const isChangelogEntry = label.startsWith(CHANGELOG_PREFIX)
  const problems = isChangelogEntry ? entryKeyProblems(translation) : titleProblems(translation)

  if (JSON.stringify(codeBlocks(source)) !== JSON.stringify(codeBlocks(target))) {
    problems.push(`Changed code examples in ${label}`)
  }

  if (TRANSLATION_MARKER_PATTERN.test(target)) {
    problems.push(`Unresolved translation marker in ${label}`)
  }

  problems.push(...codeValueProblems(translation), ...linkProblems(translation), ...bareUrlProblems(translation))

  if (locale === I18N.DEFAULT_LOCALE) {
    return problems
  }

  problems.push(...structureProblems(translation), ...untranslatedParagraphProblems(translation))

  return isChangelogEntry ? problems : [...problems, ...untranslatedFieldProblems(translation)]
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

export const sourcePages = (): string[] =>
  listFiles(CONTENT_DIR)
    .filter((path) => path.endsWith(SOURCE_MDX_SUFFIX) || path.endsWith(SOURCE_META_SUFFIX))
    .map((path) => relative(CONTENT_DIR, path))

export const pageProblems = (page: string): string[] => {
  const sourcePath = join(CONTENT_DIR, page)
  const source = readFileSync(sourcePath, "utf8")

  return I18N.SUPPORTED_LOCALES.flatMap((locale) => translationProblems({ locale, source, sourcePath }))
}

export const pullRequestEntryProblems = (ref: string): string[] => {
  const pullRequest = pullRequestOf(ref)

  if (pullRequest === undefined || existsSync(join(REPOSITORY_DIR, CHANGELOG_DIRECTORY, `${pullRequest}${SOURCE_MDX_SUFFIX}`))) {
    return []
  }

  return [`Pull request #${pullRequest} has no changelog entry: add ${CHANGELOG_DIRECTORY}/${pullRequest}.<locale>.mdx in every locale`]
}

if (import.meta.main) {
  const problems = [...sourcePages().flatMap((page) => pageProblems(page)), ...pullRequestEntryProblems(process.env["GITHUB_REF"] ?? "")]

  if (problems.length > 0) {
    console.error(problems.join("\n"))
    process.exit(FAILURE_EXIT_CODE)
  }

  console.log(
    `✅ Content files, navigation, code examples, inline code, components, links and tables match across ${I18N.SUPPORTED_LOCALES.length} locales, and the docs quote the code's own values.`,
  )
}
