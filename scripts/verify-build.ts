import { Transpiler, YAML } from "bun"
import { staticClient } from "fumadocs-core/search/client/orama-static"
import { accessSync, existsSync, globSync, readFileSync, readdirSync, statSync } from "node:fs"
import { dirname, join, relative, resolve } from "node:path"
import process from "node:process"
import { pathToFileURL } from "node:url"
import * as zod from "zod"

import { BLOG_DIRECTORY, DOCS_DIRECTORY } from "~/src/integrations/fumadocs/fumadocs.indexes"
import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { localeLinks, localizePathname } from "~/src/integrations/use-intl/i18n.paths"

import { ENVIRONMENT } from "~/src/modules/_core/constants/api"

import { UNLISTED_ROUTES } from "~/src/areas/shared"

import { CLIENT_DIR } from "./prerendered-pages.ts"
import { scriptArguments } from "./run-command.ts"
import { readWranglerEnvironment } from "./wrangler-config.ts"
import * as ROUTES from "~/src/routes"

const ASSETS_DIR = join(CLIENT_DIR, "assets")
const DEPLOY_CONFIG_PATH = ".wrangler/deploy/config.json"
const WORKER_CONFIG_PATH = "dist/server/wrangler.json"
const SERVER_DIR = "dist/server"
const WORKER_ENTRY_MODULE = "// src/server.ts"
const ROUTE_TREE_MODULE = "// src/routeTree.gen.ts"
const CONTENT_MODULE = /^\/\/ content\/.+\?collection=[\w-]+/mu
const SEARCH_INDEX = /^search-index-(?<locale>[a-zA-Z-]+)-[\da-f]+\.json$/u
const BOOT_CLOSURE_MAX_BYTES = 51_200
const BOOT_CLOSURE_FORBIDDEN_MODULE = /^\/\/ node_modules\/(?<name>@polar-sh\/[^/\n]+|drizzle-orm|resend)\//gmu
const CLIENT_ENTRY_SCRIPT = /<script\b(?=[^>]*\btype="module")(?=[^>]*\bsrc="\/(?<entry>assets\/[^"]+)")[^>]*>/u
const PAGE_MESSAGES_LOADER = /messages\/[^/"`]+\/pages\.[^/"`]+\.json/u
const CHECKOUT_EMBED = /polar-loader-spinner/u

const LOCALIZED_PAGES = [ROUTES.HOME, ROUTES.PRIVACY, ROUTES.TERMS, ROUTES.REFUNDS, ROUTES.LICENCE, ROUTES.AFFILIATES]
const LOCALE_ALIASES = [...I18N.SUPPORTED_LOCALES.map((locale) => `/${locale.split("-")[0]}`), `/${I18N.DEFAULT_LOCALE}`]

const SEO_LINKS = localeLinks({ origin: "", pathname: ROUTES.HOME })
const CANONICAL_LINKS = SEO_LINKS.filter(({ rel }) => rel === "canonical").length
const ALTERNATE_LINKS = SEO_LINKS.filter(({ rel }) => rel === "alternate").length

const CONTENT_ROUTES = [
  { directory: DOCS_DIRECTORY, route: ROUTES.DOCS },
  { directory: BLOG_DIRECTORY, route: ROUTES.BLOG },
]
const CONTENT_PAGE = /^(?<slug>.*?)(?:(?:^|\/)index)?\.(?<locale>[a-zA-Z-]+)\.mdx$/u
const FRONTMATTER = /^---\r?\n(?<yaml>[\s\S]*?)\r?\n---/u

const environmentSchema = zod.enum([ENVIRONMENT.PREVIEW, ENVIRONMENT.PRODUCTION, ENVIRONMENT.TEST])
const deploymentSchema = zod.object({ configPath: zod.string() })
const workerConfigSchema = zod.object({ name: zod.string() })
const contentPageSchema = zod.object({ locale: zod.enum(I18N.SUPPORTED_LOCALES), slug: zod.string() })
const frontmatterSchema = zod.object({ yaml: zod.string() })
const searchIndexSchema = zod.object({ locale: zod.enum(I18N.SUPPORTED_LOCALES) })
const publicationSchema = zod.object({ published: zod.boolean().default(true) })
const titleSchema = zod.object({ title: zod.string() })
const PAGE_RESULT = "page"
const ALL_RESULTS = { limit: Number.MAX_SAFE_INTEGER }

const frontmatterOf = (file: string): unknown => {
  const { yaml } = frontmatterSchema.parse(FRONTMATTER.exec(readFileSync(file, "utf8"))?.groups)

  return YAML.parse(yaml)
}

const isPublished = (file: string): boolean => publicationSchema.parse(frontmatterOf(file)).published

const [environmentArgument] = scriptArguments()
const environment = environmentSchema.parse(environmentArgument)
const deployment = deploymentSchema.parse(JSON.parse(readFileSync(DEPLOY_CONFIG_PATH, "utf8")))

if (resolve(dirname(DEPLOY_CONFIG_PATH), deployment.configPath) !== resolve(WORKER_CONFIG_PATH)) {
  throw new Error(`The Worker deployment config does not point to ${WORKER_CONFIG_PATH}`)
}

const worker = workerConfigSchema.parse(JSON.parse(readFileSync(WORKER_CONFIG_PATH, "utf8")))
const target = await readWranglerEnvironment(environment)

if (worker.name !== target.name) {
  throw new Error(`The Worker build is ${worker.name}, not the ${environment} Worker`)
}

accessSync(join(CLIENT_DIR, "index.html"))

for (const locale of I18N.SUPPORTED_LOCALES) {
  for (const pathname of LOCALIZED_PAGES) {
    const localized = localizePathname({ locale, pathname })
    const html = readFileSync(join(CLIENT_DIR, localized, "index.html"), "utf8")

    if (!new RegExp(`<html\\b[^>]*\\blang="${locale}"`, "u").test(html)) {
      throw new Error(`Incorrect document language: ${localized}`)
    }

    const links = [...html.matchAll(/<link\b[^>]*>/gu)].map(([tag]) => tag)
    const canonical = links.filter((tag) => /\brel="canonical"/u.test(tag))
    const alternates = links.filter((tag) => /\brel="alternate"/u.test(tag) && /\bhref[Ll]ang=/u.test(tag))

    if (canonical.length !== CANONICAL_LINKS || alternates.length !== ALTERNATE_LINKS) {
      throw new Error(`Missing or duplicate localized SEO links: ${localized}`)
    }

    const href = /\bhref="(?<url>[^"]+)"/u.exec(canonical[0] ?? "")?.groups?.["url"]

    if (href === undefined || new URL(href).pathname !== localized) {
      throw new Error(`Incorrect canonical URL: ${localized}`)
    }
  }
}

accessSync(join(CLIENT_DIR, "fonts"))

for (const alias of LOCALE_ALIASES) {
  if (existsSync(join(CLIENT_DIR, alias, "index.html"))) {
    throw new Error(`Unexpected prerendered locale alias: ${alias}`)
  }
}

for (const route of UNLISTED_ROUTES) {
  const prerendered = globSync("**/index.html", { cwd: join(CLIENT_DIR, route) })

  if (prerendered.length > 0) {
    throw new Error(`Unexpected prerendered page under ${route}, which the Worker renders on each request: ${prerendered.join(", ")}`)
  }
}

for (const { directory, route } of CONTENT_ROUTES) {
  for (const file of globSync("**/*.mdx", { cwd: directory })) {
    const { locale, slug } = contentPageSchema.parse(CONTENT_PAGE.exec(file)?.groups)
    const pathname = localizePathname({ locale, pathname: [route, slug].filter(Boolean).join("/") })

    if (isPublished(join(directory, file)) && !existsSync(join(CLIENT_DIR, pathname, "index.html"))) {
      throw new Error(`Content page was not prerendered, and the deployed Worker cannot render it: ${pathname}`)
    }
  }
}

const clientScripts = readdirSync(ASSETS_DIR).filter((name) => name.endsWith(".js"))

if (clientScripts.length === 0) {
  throw new Error("Missing client JavaScript")
}

const scanner = new Transpiler({ loader: "js" })

for (const file of clientScripts) {
  const { imports } = scanner.scan(readFileSync(join(ASSETS_DIR, file), "utf8"))

  if (imports.some(({ path: specifier }) => specifier === "cloudflare:workers")) {
    throw new Error(`Server-only code in client asset: ${file}`)
  }
}

const importsOf = (file: string, kind: string): string[] =>
  scanner
    .scan(readFileSync(file, "utf8"))
    .imports.filter((imported) => imported.kind === kind && imported.path.startsWith("."))
    .map(({ path: specifier }) => resolve(dirname(file), specifier))

const staticImportsOf = (file: string): string[] => importsOf(file, "import-statement")

const staticClosureOf = (entry: string): string[] => {
  const closure = [entry]

  for (const file of closure) {
    closure.push(...staticImportsOf(file).filter((imported) => !closure.includes(imported)))
  }

  return closure
}

const clientEntry = CLIENT_ENTRY_SCRIPT.exec(readFileSync(join(CLIENT_DIR, "index.html"), "utf8"))?.groups?.["entry"]

if (clientEntry === undefined) {
  throw new Error(`${join(CLIENT_DIR, "index.html")} loads no module script`)
}

const eagerMessages = staticClosureOf(resolve(CLIENT_DIR, clientEntry))
  .filter((file) => PAGE_MESSAGES_LOADER.test(readFileSync(file, "utf8")))
  .map((file) => relative(process.cwd(), file))

if (eagerMessages.length > 0) {
  throw new Error(
    `Every page loads the message loaders of the page namespaces in ${eagerMessages.join(", ")}; import them where a namespace is loaded`,
  )
}

const clientAssets = clientScripts.map((file) => resolve(ASSETS_DIR, file))
const checkoutEmbeds = clientAssets.filter((file) => CHECKOUT_EMBED.test(readFileSync(file, "utf8")))
const [checkoutEmbed] = checkoutEmbeds

if (checkoutEmbed === undefined || checkoutEmbeds.length > 1) {
  throw new Error(`Expected Polar's checkout embed in one client asset, found it in ${String(checkoutEmbeds.length)}`)
}

if (checkoutEmbed === resolve(CLIENT_DIR, clientEntry) || clientAssets.some((file) => staticImportsOf(file).includes(checkoutEmbed))) {
  throw new Error(
    `Pages load Polar's checkout embed in ${relative(process.cwd(), checkoutEmbed)} as their entry script or with a static import; import() it when a buyer starts a checkout`,
  )
}

if (!clientAssets.some((file) => importsOf(file, "dynamic-import").includes(checkoutEmbed))) {
  throw new Error(`No client asset imports Polar's checkout embed in ${relative(process.cwd(), checkoutEmbed)} when a checkout starts`)
}

const serverChunks = globSync("**/*.js", { cwd: SERVER_DIR }).map((file) => resolve(SERVER_DIR, file))

const chunkOf = (module: string): string => {
  const chunk = serverChunks.find((file) => readFileSync(file, "utf8").split("\n").includes(module))

  if (chunk === undefined) {
    throw new Error(`No file in ${SERVER_DIR} holds ${module.slice("// ".length)}`)
  }

  return chunk
}

const bytesOf = (files: string[]): number => files.reduce((total, file) => total + statSync(file).size, 0)

const bootClosure = staticClosureOf(chunkOf(WORKER_ENTRY_MODULE))

const bootBytes = bytesOf(bootClosure)
const bootPackages = new Set(
  bootClosure.flatMap((file) =>
    [...readFileSync(file, "utf8").matchAll(BOOT_CLOSURE_FORBIDDEN_MODULE)].map(({ groups }) => groups?.["name"]),
  ),
)

if (bootPackages.size > 0) {
  throw new Error(`The Worker loads ${[...bootPackages].join(", ")} on every cold start; import it where a request needs it`)
}

if (bootBytes > BOOT_CLOSURE_MAX_BYTES) {
  throw new Error(`The Worker loads ${String(bootBytes)} bytes on every cold start, more than BOOT_CLOSURE_MAX_BYTES`)
}

const contentChunks = serverChunks.filter((file) => CONTENT_MODULE.test(readFileSync(file, "utf8")))

if (contentChunks.length > 0) {
  throw new Error(
    `The deployed Worker holds docs or blog content in ${contentChunks.map((file) => relative(process.cwd(), file)).join(", ")}; it serves those pages prerendered and reads the content indexes`,
  )
}

const searchIndexes = readdirSync(ASSETS_DIR).flatMap((name) => {
  const groups = SEARCH_INDEX.exec(name)?.groups

  return groups === undefined ? [] : [{ locale: searchIndexSchema.parse(groups).locale, name }]
})

const docsPage = (file: string): string => {
  const { slug } = contentPageSchema.parse(CONTENT_PAGE.exec(file)?.groups)
  const { title } = titleSchema.parse(frontmatterOf(join(DOCS_DIRECTORY, file)))

  return `${[ROUTES.DOCS, slug].filter(Boolean).join("/")} ${title}`
}

const verifySearchIndex = async (locale: SupportedLocale): Promise<void> => {
  const indexes = searchIndexes.filter((index) => index.locale === locale)
  const [index] = indexes

  if (index === undefined || indexes.length > 1) {
    throw new Error(`Expected one docs search index for ${locale} in ${ASSETS_DIR}, found ${String(indexes.length)}`)
  }

  const from = pathToFileURL(resolve(ASSETS_DIR, index.name)).href
  const results = await staticClient({ from, search: ALL_RESULTS }).search("")
  const indexed = results.filter(({ type }) => type === PAGE_RESULT).map(({ content, url }) => `${url} ${content}`)
  const pages = globSync(`**/*.${locale}.mdx`, { cwd: DOCS_DIRECTORY }).map((file) => docsPage(file))

  if (indexed.toSorted().join("\n") !== pages.toSorted().join("\n")) {
    throw new Error(
      `The ${locale} docs search index does not hold exactly the ${String(pages.length)} pages of ${DOCS_DIRECTORY} under their ${locale} titles`,
    )
  }
}

await Promise.all(I18N.SUPPORTED_LOCALES.map((locale) => verifySearchIndex(locale)))

const serverBytes = bytesOf(serverChunks)
const routeTreeBytes = bytesOf(staticClosureOf(chunkOf(ROUTE_TREE_MODULE)))

process.stdout.write(
  `Verified the ${environment} Worker deployment config, prerendered locales and content pages, fonts, client assets, an entry script without the page messages, Polar's checkout embed loaded only when a checkout starts, the ${String(bootBytes)} bytes the Worker loads on a cold start, the ${String(routeTreeBytes)} bytes of the route tree, a Worker of ${String(serverChunks.length)} files and ${String(serverBytes)} bytes without any docs or blog content, and one docs search index per locale with every docs page of that locale.\n`,
)
