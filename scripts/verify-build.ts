import { Transpiler, YAML } from "bun"
import { accessSync, existsSync, globSync, readFileSync, readdirSync, statSync } from "node:fs"
import { dirname, join, relative, resolve } from "node:path"
import process from "node:process"
import { z } from "zod/v4"

import { I18N } from "~/src/integrations/use-intl/i18n.config"
import { localeLinks, localizePathname } from "~/src/integrations/use-intl/i18n.paths"

import { ENVIRONMENT } from "~/src/modules/_core/constants/api"

import { UNLISTED_ROUTES } from "~/src/data/unlisted"

import { readWranglerEnvironment } from "./wrangler-config.ts"
import { ROUTES } from "~/src/routes"

const SCRIPT_ARGUMENTS_START = 2
const CLIENT_DIR = "dist/client"
const ASSETS_DIR = join(CLIENT_DIR, "assets")
const DEPLOY_CONFIG_PATH = ".wrangler/deploy/config.json"
const WORKER_CONFIG_PATH = "dist/server/wrangler.json"
const SERVER_DIR = "dist/server"
const WORKER_ENTRY_MODULE = "// src/server.ts"
const ROUTE_TREE_MODULE = "// src/routeTree.gen.ts"
const SERVER_FUNCTION_RESOLVER_MODULE = String.raw`// \0%23tanstack-start-server-fn-resolver`
const SERVER_FUNCTION_IMPORTER = /importer: \(\) => import\("(?<chunk>\.\/[^"]+)"\)/gu
const COMPILED_CONTENT_MODULE = /^\/\/ content\/.+\.mdx\?collection=[\w-]+$/mu
const BOOT_CLOSURE_MAX_BYTES = 51_200
const BOOT_CLOSURE_FORBIDDEN_MODULE = /^\/\/ node_modules\/(?<name>@polar-sh\/[^/\n]+|drizzle-orm|resend)\//gmu
const CLIENT_ENTRY_SCRIPT = /<script\b(?=[^>]*\btype="module")(?=[^>]*\bsrc="\/(?<entry>assets\/[^"]+)")[^>]*>/u
const PAGE_MESSAGES_LOADER = /messages\/[^/"`]+\/pages\.[^/"`]+\.json/u

const LOCALIZED_PAGES = [ROUTES.HOME, ROUTES.PRIVACY, ROUTES.TERMS, ROUTES.REFUNDS, ROUTES.LICENCE, ROUTES.AFFILIATES]
const LOCALE_ALIASES = [...I18N.SUPPORTED_LOCALES.map((locale) => `/${locale.split("-")[0]}`), `/${I18N.DEFAULT_LOCALE}`]

const SEO_LINKS = localeLinks({ origin: "", pathname: ROUTES.HOME })
const CANONICAL_LINKS = SEO_LINKS.filter(({ rel }) => rel === "canonical").length
const ALTERNATE_LINKS = SEO_LINKS.filter(({ rel }) => rel === "alternate").length

const CONTENT_ROUTES = [
  { directory: "content/docs", route: ROUTES.DOCS },
  { directory: "content/blog", route: ROUTES.BLOG },
]
const CONTENT_PAGE = /^(?<slug>.*?)(?:(?:^|\/)index)?\.(?<locale>[a-zA-Z-]+)\.mdx$/u
const FRONTMATTER = /^---\r?\n(?<yaml>[\s\S]*?)\r?\n---/u

const environmentSchema = z.enum([ENVIRONMENT.PREVIEW, ENVIRONMENT.PRODUCTION, ENVIRONMENT.TEST])
const deploymentSchema = z.object({ configPath: z.string() })
const workerConfigSchema = z.object({ name: z.string() })
const contentPageSchema = z.object({ locale: z.enum(I18N.SUPPORTED_LOCALES), slug: z.string() })
const frontmatterSchema = z.object({ yaml: z.string() })
const serverFunctionSchema = z.object({ chunk: z.string() })
const publicationSchema = z.object({ published: z.boolean().default(true) })

const isPublished = (file: string): boolean => {
  const { yaml } = frontmatterSchema.parse(FRONTMATTER.exec(readFileSync(file, "utf8"))?.groups)

  return publicationSchema.parse(YAML.parse(yaml)).published
}

const environment = environmentSchema.parse(process.argv[SCRIPT_ARGUMENTS_START])
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

const staticImportsOf = (file: string): string[] =>
  scanner
    .scan(readFileSync(file, "utf8"))
    .imports.filter(({ kind, path: specifier }) => kind === "import-statement" && specifier.startsWith("."))
    .map(({ path: specifier }) => resolve(dirname(file), specifier))

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

const routeTree = chunkOf(ROUTE_TREE_MODULE)
const resolver = chunkOf(SERVER_FUNCTION_RESOLVER_MODULE)
const serverFunctions = [...readFileSync(resolver, "utf8").matchAll(SERVER_FUNCTION_IMPORTER)].map(({ groups }) =>
  resolve(dirname(resolver), serverFunctionSchema.parse(groups).chunk),
)

if (serverFunctions.length === 0) {
  throw new Error(`${relative(process.cwd(), resolver)} lists no server functions`)
}

for (const entry of [routeTree, ...serverFunctions]) {
  const pages = staticClosureOf(entry).filter((file) => COMPILED_CONTENT_MODULE.test(readFileSync(file, "utf8")))

  if (pages.length > 0) {
    throw new Error(
      `${relative(process.cwd(), entry)} loads the compiled MDX of ${String(pages.length)} docs and blog pages on its first request; load a page when a request needs it`,
    )
  }
}

const routeTreeBytes = bytesOf(staticClosureOf(routeTree))

process.stdout.write(
  `Verified the ${environment} Worker deployment config, prerendered locales and content pages, fonts, client assets, an entry script without the page messages, the ${String(bootBytes)} bytes the Worker loads on a cold start, and the ${String(routeTreeBytes)} bytes of the route tree and the ${String(serverFunctions.length)} server functions, none of which loads a compiled docs or blog page.\n`,
)
