import { describe, expect, it } from "vite-plus/test"

import { ROBOTS } from "~/src/lib/seo"
import { buildSitemap, isIndexable, listedPages } from "~/src/lib/sitemap"

import { APP_URL } from "~/src/presentation/branding"

const page = (path: string, robots?: string) => ({
  alternates: [
    { href: `${APP_URL}${path}`, hreflang: "en-US" },
    { href: `${APP_URL}${path}`, hreflang: "x-default" },
  ],
  canonical: `${APP_URL}${path}`,
  robots,
})

describe("isIndexable", () => {
  it.each([
    [undefined, true],
    [ROBOTS.NON_PRODUCTION, true],
    ["max-image-preview:large", true],
    [ROBOTS.NOINDEX, false],
    ["NOINDEX, follow", false],
    ["none", false],
  ])("treats a page whose robots directive is %j as indexable: %s", (robots, indexable) => {
    expect(isIndexable(robots)).toBe(indexable)
  })
})

describe("listedPages", () => {
  it("leaves out pages that ask not to be indexed and paths robots.txt disallows", () => {
    const pages = [page("/"), page("/premium", ROBOTS.NOINDEX), page("/private/report"), page("/docs", ROBOTS.NON_PRODUCTION)]

    expect(listedPages(pages, "User-agent: *\nDisallow: /private/").map(({ canonical }) => canonical)).toStrictEqual([
      `${APP_URL}/`,
      `${APP_URL}/docs`,
    ])
  })
})

describe("buildSitemap", () => {
  it("lists every page once, sorted, with its language alternates", () => {
    expect(buildSitemap([page("/docs"), page("/")])).toBe(
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
        "  <url>",
        `    <loc>${APP_URL}/</loc>`,
        `    <xhtml:link rel="alternate" hreflang="en-US" href="${APP_URL}/"/>`,
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${APP_URL}/"/>`,
        "  </url>",
        "  <url>",
        `    <loc>${APP_URL}/docs</loc>`,
        `    <xhtml:link rel="alternate" hreflang="en-US" href="${APP_URL}/docs"/>`,
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${APP_URL}/docs"/>`,
        "  </url>",
        "</urlset>",
        "",
      ].join("\n"),
    )
  })

  it("escapes the characters XML reserves", () => {
    expect(buildSitemap([page(`/search?q="a"&b='c'<d>`)])).toContain(
      `<loc>${APP_URL}/search?q=&quot;a&quot;&amp;b=&apos;c&apos;&lt;d&gt;</loc>`,
    )
  })

  it("refuses a page listed twice or an alternate the sitemap does not list", () => {
    expect(() => buildSitemap([page("/"), page("/")])).toThrow(`${APP_URL}/ is listed twice`)
    expect(() => buildSitemap([{ ...page("/"), alternates: [{ href: `${APP_URL}/de-DE`, hreflang: "de-DE" }] }])).toThrow(
      `${APP_URL}/ names ${APP_URL}/de-DE as an alternate, which is not listed`,
    )
  })
})
