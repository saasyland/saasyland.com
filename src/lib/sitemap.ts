import { I18N } from "~/src/integrations/use-intl/i18n.config"
import { localeLinks, localizePathname } from "~/src/integrations/use-intl/i18n.paths"

import type { PageHead } from "~/src/lib/page-head"
import { isAllowedByRobots, parseRobotsRules } from "~/src/lib/robots"
import { ROBOTS } from "~/src/lib/seo"

const SITEMAP_NAMESPACE = "http://www.sitemaps.org/schemas/sitemap/0.9"
const XHTML_NAMESPACE = "http://www.w3.org/1999/xhtml"

const NOINDEX = /\b(?:noindex|none)\b/iu
const W3C_DATE_LENGTH = "YYYY-MM-DD".length
const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8"?>'

export const SITEMAP_CONTENT_TYPE = "application/xml; charset=utf-8"

export type SitemapPage = Pick<PageHead, "alternates" | "canonical" | "modified">

export const escapeXml = (value: string): string =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;")

export const isIndexable = (robots: string | undefined): boolean =>
  robots === undefined || robots === ROBOTS.NON_PRODUCTION || !NOINDEX.test(robots)

export const listedPages = <TPage extends Pick<PageHead, "canonical" | "robots">>(pages: readonly TPage[], robotsTxt: string): TPage[] => {
  const rules = parseRobotsRules(robotsTxt)

  return pages.filter(({ canonical, robots }) => isIndexable(robots) && isAllowedByRobots(rules, new URL(canonical).pathname))
}

const findProblems = (pages: readonly SitemapPage[]): string[] => {
  const listed = new Set(pages.map(({ canonical }) => canonical))
  const duplicates = pages.filter(({ canonical }, index) => pages.findIndex((page) => page.canonical === canonical) !== index)

  return [
    ...duplicates.map(({ canonical }) => `${canonical} is listed twice`),
    ...pages.flatMap(({ alternates, canonical }) =>
      alternates
        .filter(({ href }) => !listed.has(href))
        .map(({ href }) => `${canonical} names ${href} as an alternate, which is not listed`),
    ),
  ]
}

const urlEntry = ({ alternates, canonical, modified }: SitemapPage): string =>
  [
    "  <url>",
    `    <loc>${escapeXml(canonical)}</loc>`,
    ...(modified === undefined ? [] : [`    <lastmod>${modified.slice(0, W3C_DATE_LENGTH)}</lastmod>`]),
    ...alternates.map(
      ({ href, hreflang }) => `    <xhtml:link rel="alternate" hreflang="${escapeXml(hreflang)}" href="${escapeXml(href)}"/>`,
    ),
    "  </url>",
  ].join("\n")

export const buildSitemap = (pages: readonly SitemapPage[]): string => {
  const problems = findProblems(pages)

  if (problems.length > 0) {
    throw new Error(`The sitemap would contradict itself:\n${problems.join("\n")}`)
  }

  return [
    XML_DECLARATION,
    `<urlset xmlns="${SITEMAP_NAMESPACE}" xmlns:xhtml="${XHTML_NAMESPACE}">`,
    ...pages.toSorted((first, second) => first.canonical.localeCompare(second.canonical)).map((page) => urlEntry(page)),
    "</urlset>",
    "",
  ].join("\n")
}

export const localizedSitemapPages = ({
  baseUrl,
  modified,
  pathname,
}: {
  readonly baseUrl: string
  readonly modified: Date
  readonly pathname: string
}): SitemapPage[] =>
  I18N.SUPPORTED_LOCALES.map((locale) => {
    const canonical = `${baseUrl}${localizePathname({ locale, pathname })}`
    const alternates = localeLinks({ origin: baseUrl, pathname }).flatMap(({ href, hrefLang }) =>
      hrefLang === undefined ? [] : [{ href, hreflang: hrefLang }],
    )

    return { alternates, canonical, modified: modified.toISOString() }
  })

export const buildSitemapIndex = (locations: readonly string[]): string =>
  [
    XML_DECLARATION,
    `<sitemapindex xmlns="${SITEMAP_NAMESPACE}">`,
    ...locations.map((location) => ["  <sitemap>", `    <loc>${escapeXml(location)}</loc>`, "  </sitemap>"].join("\n")),
    "</sitemapindex>",
    "",
  ].join("\n")
