import { createHash } from "node:crypto"
import { globSync } from "node:fs"
import { join, relative } from "node:path"
import { type Plugin, runnerImport } from "vite-plus"

import type * as Builder from "../src/integrations/fumadocs/fumadocs.indexes.ts"

type ContentIndexes = Awaited<ReturnType<typeof Builder.createContentIndexes>>

type Locale = ContentIndexes["locales"][number]

const MODULE_ID = "virtual:content-indexes"
const SEARCH_MODULE_ID = "virtual:docs-search"
const MODULE_IDS = /^virtual:(?:content-indexes|docs-search)(?:\/|$)/u
const RESOLVED_MODULE_IDS = /^\0virtual:(?:content-indexes|docs-search)(?:\/|$)/u
const RESOLVED = "\0"
const DOCS_INDEX = "docs-index"
const BLOG_INDEX = "blog-index"
const LOCALE_INDEX = new RegExp(`^${MODULE_ID}/(?<kind>${DOCS_INDEX}|${BLOG_INDEX})-(?<locale>[\\w-]+)$`, "u")
const BUILDER = "src/integrations/fumadocs/fumadocs.indexes.ts"
const CONTENT_FILES = "content/**/*.{json,mdx}"
const CONTENT_DIRECTORY = "content"
const SEARCH_INDEX = "search-index-"
const SEARCH_INDEX_EXTENSION = ".json"
const SEARCH_INDEX_ROUTE = "/@content-indexes/"
const SEARCH_INDEX_REQUEST = /^\/search-index-(?<locale>[\w-]+)\.json$/u
const ASSETS_DIRECTORY = "assets/"
const HASH_LENGTH = 8
const JSON_CONTENT_TYPE = "application/json"
const CLIENT = "client"

const jsonModule = (data: unknown): string => `export default JSON.parse(${JSON.stringify(JSON.stringify(data))})`

const importers = ({ kind, locales }: { kind: string; locales: readonly Locale[] }): string =>
  `{${locales.map((locale) => `${JSON.stringify(locale)}: () => import(${JSON.stringify(`${MODULE_ID}/${kind}-${locale}`)})`).join(",")}}`

const loadersModule = (locales: readonly Locale[]): string =>
  [
    `const DOCS = ${importers({ kind: DOCS_INDEX, locales })}`,
    `const BLOG = ${importers({ kind: BLOG_INDEX, locales })}`,
    "export const loadDocsIndex = (locale) => DOCS[locale]().then((module) => module.default)",
    "export const loadBlogIndex = (locale) => BLOG[locale]().then((module) => module.default)",
  ].join("\n")

const hashOf = (text: string): string => createHash("sha256").update(text).digest("hex").slice(0, HASH_LENGTH)

export const contentIndexes = (): Plugin => {
  const config = { base: "/", root: "", serving: false }
  const builds = new Map<string, Promise<ContentIndexes>>()
  const searchIndexes = new Map<Locale, Promise<string>>()

  const contentIndexesOf = (): Promise<ContentIndexes> => {
    const built =
      builds.get(config.root) ??
      runnerImport<typeof Builder>(join(config.root, BUILDER), { resolve: { tsconfigPaths: true }, root: config.root }).then(({ module }) =>
        module.createContentIndexes(config.root),
      )
    builds.set(config.root, built)

    return built
  }

  const localeOf = async (candidate: string | undefined): Promise<Locale> => {
    const { locales } = await contentIndexesOf()
    const locale = locales.find((supported) => supported === candidate)
    if (locale === undefined) {
      throw new Error(`No content index for the locale ${String(candidate)}`)
    }

    return locale
  }

  const searchIndexOf = (locale: Locale): Promise<string> => {
    const built = searchIndexes.get(locale) ?? contentIndexesOf().then(async ({ search }) => JSON.stringify(await search(locale)))
    searchIndexes.set(locale, built)

    return built
  }

  return {
    async buildStart() {
      if (!config.serving) {
        const { locales } = await contentIndexesOf()
        await Promise.all(locales.map((locale) => searchIndexOf(locale)))
      }
    },
    configResolved({ base, command, root }) {
      Object.assign(config, { base, root, serving: command === "serve" })
    },
    configureServer(server) {
      server.middlewares.use(SEARCH_INDEX_ROUTE, (request, response, next) => {
        localeOf(SEARCH_INDEX_REQUEST.exec(request.url ?? "")?.groups?.["locale"])
          .then(searchIndexOf)
          .then((json) => {
            response.setHeader("Content-Type", JSON_CONTENT_TYPE)
            response.end(json)
          }, next)
      })
    },
    load: {
      filter: { id: RESOLVED_MODULE_IDS },
      async handler(id) {
        const module = id.slice(RESOLVED.length)
        if (config.serving) {
          for (const file of globSync(CONTENT_FILES, { cwd: config.root })) {
            this.addWatchFile(join(config.root, file))
          }
        }
        const { blog, docs, locales } = await contentIndexesOf()

        if (module === MODULE_ID) {
          return loadersModule(locales)
        }

        if (module === SEARCH_MODULE_ID) {
          const urls = await Promise.all(
            locales.map(async (locale) => {
              if (config.serving) {
                return [locale, `${SEARCH_INDEX_ROUTE}${SEARCH_INDEX}${locale}${SEARCH_INDEX_EXTENSION}`] as const
              }
              const json = await searchIndexOf(locale)
              const fileName = `${ASSETS_DIRECTORY}${SEARCH_INDEX}${locale}-${hashOf(json)}${SEARCH_INDEX_EXTENSION}`
              if (this.environment.config.consumer === CLIENT) {
                this.emitFile({ fileName, source: json, type: "asset" })
              }

              return [locale, `${config.base}${fileName}`] as const
            }),
          )

          return `export const SEARCH_INDEXES = ${JSON.stringify(Object.fromEntries(urls))}`
        }

        const groups = LOCALE_INDEX.exec(module)?.groups
        const locale = await localeOf(groups?.["locale"])

        return jsonModule(groups?.["kind"] === DOCS_INDEX ? await docs(locale) : await blog(locale))
      },
    },
    name: "saasyland:content-indexes",
    resolveId: {
      filter: { id: MODULE_IDS },
      handler: (id) => `${RESOLVED}${id}`,
    },
    watchChange(id) {
      if (!relative(join(config.root, CONTENT_DIRECTORY), id).startsWith("..")) {
        builds.clear()
        searchIndexes.clear()
      }
    },
  }
}
