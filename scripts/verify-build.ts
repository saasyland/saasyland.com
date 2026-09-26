import { Transpiler } from "bun"
import { accessSync, existsSync, readFileSync, readdirSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import process from "node:process"
import { z } from "zod/v4"

import { I18N } from "~/src/integrations/use-intl/i18n.config"
import { localeLinks, localizePathname } from "~/src/integrations/use-intl/i18n.paths"

import { ROUTES } from "~/src/routes"

const CLIENT_DIR = "dist/client"
const ASSETS_DIR = join(CLIENT_DIR, "assets")
const DEPLOY_CONFIG_PATH = ".wrangler/deploy/config.json"

const LOCALIZED_PAGES = [ROUTES.HOME, ROUTES.PRIVACY, ROUTES.TERMS, ROUTES.REFUNDS, ROUTES.LICENCE]
const UNPRERENDERED_PAGES = [
  ...I18N.SUPPORTED_LOCALES.map((locale) => `/${locale.split("-")[0]}`),
  `/${I18N.DEFAULT_LOCALE}`,
  ROUTES.ADMIN,
  ROUTES.APP,
  ROUTES.SIGN_IN,
]

const SEO_LINKS = localeLinks({ origin: "", pathname: ROUTES.HOME })
const CANONICAL_LINKS = SEO_LINKS.filter(({ rel }) => rel === "canonical").length
const ALTERNATE_LINKS = SEO_LINKS.filter(({ rel }) => rel === "alternate").length

const deploymentSchema = z.object({ configPath: z.string() })

const deployment = deploymentSchema.parse(JSON.parse(readFileSync(DEPLOY_CONFIG_PATH, "utf8")))
accessSync(resolve(dirname(DEPLOY_CONFIG_PATH), deployment.configPath))
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

for (const page of UNPRERENDERED_PAGES) {
  if (existsSync(join(CLIENT_DIR, page, "index.html"))) {
    throw new Error(`Unexpected prerendered alias or protected page: ${page}`)
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

process.stdout.write("Verified Worker deployment config, prerendered locales, fonts, and client assets.\n")
