import { globSync, readFileSync } from "node:fs"
import { basename, join } from "node:path"

import { frontmatter } from "fumadocs-core/content/md/frontmatter"
import * as zod from "zod"

import { BLOG_ARCHIVE } from "../../src/data/blog"
import { I18N } from "../../src/integrations/use-intl/i18n.config"
import { deLocalizePathname, localizePathname } from "../../src/integrations/use-intl/i18n.paths"
import { HTTP_STATUS } from "../../src/modules/_core/constants/api"
import { BLOG_FEED, blogFeedPath } from "../../src/lib/feed"
import { readPageHead } from "../../src/lib/page-head"
import { ORGANIZATION_LOGO, ORGANIZATION_STRUCTURED_DATA_HTML, SITEMAP_PATH, SOCIAL_IMAGE } from "../../src/lib/seo"
import { isIndexable, listedPages } from "../../src/lib/sitemap"
import { APP_URL } from "../../src/presentation/branding"
import { ROUTES } from "../../src/routes"
import { expect, test } from "../fixtures/test"

const CLIENT_DIR = "dist/client"
const LOCATION = /<loc>(?<url>[^<]+)<\/loc>/gu
const URL_ENTRY = /<url>\s*<loc>(?<url>[^<]+)<\/loc>\s*(?:<lastmod>(?<lastmod>[^<]+)<\/lastmod>)?/gu
const BLOG_POST_FILE = /^(?<slug>.+)\.(?<locale>[^.]+)\.mdx$/u
const PNG_WIDTH_OFFSET = 16
const PNG_HEIGHT_OFFSET = 20
const REQUESTS_AT_ONCE = 16
const FEED_ITEM = /<item>\s*<title>[^<]*<\/title>\s*<link>(?<link>[^<]+)<\/link>[\s\S]*?<pubDate>(?<published>[^<]+)<\/pubDate>/gu
const XML_CONTENT_TYPE = /^(?:application|text)\/xml/u
const POST_PREFIX = `${ROUTES.BLOG}/`
const ARCHIVE_PREFIX = `${POST_PREFIX}${BLOG_ARCHIVE.PAGE_SEGMENT}/`
const UNPUBLISHED = /^published:\s*false\s*$/mu

const BLOG_POST = `${ROUTES.BLOG}/${basename(globSync("content/blog/*.en-US.mdx").toSorted()[0] ?? "", ".en-US.mdx")}`
const DOCS_PAGE = `${ROUTES.DOCS}/conventions/files-and-naming`
const SHARED_PAGES = [ROUTES.HOME, DOCS_PAGE, BLOG_POST].flatMap((path) => [path, `/ja-JP${path === ROUTES.HOME ? "" : path}`])

const postFileSchema = zod.object({ locale: zod.enum(I18N.SUPPORTED_LOCALES), slug: zod.string() })
const postDatesSchema = zod.object({ date: zod.string(), published: zod.boolean().default(true), updated: zod.string().optional() })

const publishedPostDates = (): [string, string][] =>
  globSync("content/blog/*.mdx").flatMap((file) => {
    const { locale, slug } = postFileSchema.parse(BLOG_POST_FILE.exec(basename(file))?.groups)
    const { date, published, updated = date } = postDatesSchema.parse(frontmatter(readFileSync(file, "utf8")).data)
    const url = `${APP_URL}${localizePathname({ locale, pathname: `${ROUTES.BLOG}/${slug}` })}`

    return published ? [[url, updated]] : []
  })

const readSitemap = async (request: { get: (path: string) => Promise<{ status: () => number; text: () => Promise<string> }> }) => {
  const response = await request.get(SITEMAP_PATH)
  expect(response.status()).toBe(HTTP_STATUS.OK)
  return Array.from((await response.text()).matchAll(LOCATION), (match) => match.groups?.["url"] ?? "")
}

test("the sitemap lists every prerendered page that allows indexing and nothing else", async ({ request }) => {
  const listed = await readSitemap(request)
  const pages = globSync("**/index.html", { cwd: CLIENT_DIR }).map((file) => readPageHead(readFileSync(join(CLIENT_DIR, file), "utf8")))
  const expected = listedPages(pages, readFileSync("public/robots.txt", "utf8")).map(({ canonical }) => canonical)
  const unindexed = new Set(pages.filter(({ robots }) => !isIndexable(robots)).map(({ canonical }) => canonical))

  expect(listed.toSorted()).toStrictEqual(expected.toSorted())
  expect(listed).toContain(`${APP_URL}${ROUTES.HOME}`)
  expect(listed).toContain(`${APP_URL}/ja-JP${DOCS_PAGE}`)
  expect(listed.filter((url) => unindexed.has(url))).toStrictEqual([])
})

test("the sitemap dates every published blog post in every locale by its last update and leaves every other page undated", async ({
  request,
}) => {
  const response = await request.get(SITEMAP_PATH)
  const dated = Array.from((await response.text()).matchAll(URL_ENTRY), ({ groups }) => [groups?.["url"], groups?.["lastmod"]]).filter(
    ([, lastmod]) => lastmod !== undefined,
  )
  const posts = publishedPostDates()

  expect(posts.length).toBeGreaterThan(0)
  expect(Object.fromEntries(dated)).toStrictEqual(Object.fromEntries(posts))
})

test("every sitemap URL answers 200 on the built site without a redirect", async ({ request }) => {
  const listed = await readSitemap(request)

  for (let start = 0; start < listed.length; start += REQUESTS_AT_ONCE) {
    const batch = listed.slice(start, start + REQUESTS_AT_ONCE)
    const statuses = await Promise.all(batch.map(async (url) => [url, (await request.get(new URL(url).pathname, { maxRedirects: 0 })).status()]))
    expect(statuses.filter(([, status]) => status !== HTTP_STATUS.OK)).toStrictEqual([])
  }
})

test("the prerendered home page describes the organisation in structured data", async ({ request }) => {
  const { __html: html } = ORGANIZATION_STRUCTURED_DATA_HTML
  const response = await request.get(ROUTES.HOME)

  expect(response.status()).toBe(HTTP_STATUS.OK)
  expect(await response.text()).toContain(`<script type="application/ld+json">${html}</script>`)
})

test("serves the organisation's logo at the size its structured data declares", async ({ request }) => {
  const response = await request.get(ORGANIZATION_LOGO.PATH)
  const png = await response.body()

  expect(response.status()).toBe(HTTP_STATUS.OK)
  expect(response.headers()["content-type"]).toBe(SOCIAL_IMAGE.TYPE)
  expect([png.readUInt32BE(PNG_WIDTH_OFFSET), png.readUInt32BE(PNG_HEIGHT_OFFSET)]).toStrictEqual([ORGANIZATION_LOGO.SIZE, ORGANIZATION_LOGO.SIZE])
})

for (const path of [ROUTES.BLOG, BLOG_POST, `/ja-JP${ROUTES.BLOG}`, `/ja-JP${BLOG_POST}`]) {
  test(`${path} names the blog feed of its own language`, async ({ page }) => {
    await page.goto(path)
    const locale = path.startsWith("/ja-JP") ? "ja-JP" : I18N.DEFAULT_LOCALE

    await expect(page.locator(`head > link[rel="alternate"][type="${BLOG_FEED.TYPE}"]`)).toHaveAttribute("href", `${APP_URL}${blogFeedPath(locale)}`)
  })
}

test("every blog feed lists exactly the published posts of its language with their publication dates", async ({ request }) => {
  const pages = globSync("**/index.html", { cwd: CLIENT_DIR }).map((file) => readPageHead(readFileSync(join(CLIENT_DIR, file), "utf8")))

  for (const locale of I18N.SUPPORTED_LOCALES) {
    const response = await request.get(blogFeedPath(locale))
    const items = Array.from((await response.text()).matchAll(FEED_ITEM), ({ groups }) => [groups?.["link"], groups?.["published"]])
    const posts = pages
      .filter(({ canonical, lang }) => {
        const pathname = deLocalizePathname(new URL(canonical).pathname)

        return lang === locale && pathname.startsWith(POST_PREFIX) && !pathname.startsWith(ARCHIVE_PREFIX)
      })
      .map(({ canonical, published }) => [canonical, new Date(published ?? "").toUTCString()])

    expect(response.status()).toBe(HTTP_STATUS.OK)
    expect(response.headers()["content-type"]).toMatch(XML_CONTENT_TYPE)
    const published = globSync(`content/blog/*.${locale}.mdx`).filter((file) => !UNPUBLISHED.test(readFileSync(file, "utf8")))

    expect(items).toHaveLength(published.length)
    expect(items.toSorted()).toStrictEqual(posts.toSorted())
  }
})

for (const path of SHARED_PAGES) {
  test(`${path} names a social image in its own language that the site serves`, async ({ page, request }) => {
    await page.goto(path)
    const content = (selector: string) => page.locator(`head > meta[${selector}]`).getAttribute("content")
    const [image, title, alt, lang] = await Promise.all([
      content('property="og:image"'),
      content('property="og:title"'),
      content('property="og:image:alt"'),
      page.locator("html").getAttribute("lang"),
    ])

    expect(image).toMatch(new RegExp(`^${APP_URL}/images/og/.+\\.${SOCIAL_IMAGE.FORMAT}$`, "u"))
    expect(alt).toContain(title ?? "")
    expect(path.startsWith("/ja-JP")).toBe(lang === "ja-JP")
    await expect(page.locator('head > meta[name="twitter:image"]')).toHaveAttribute("content", image ?? "")
    await expect(page.locator('head > meta[name="twitter:card"]')).toHaveAttribute("content", SOCIAL_IMAGE.TWITTER_CARD)
    await expect(page.locator('head > meta[property="og:image:width"]')).toHaveAttribute("content", String(SOCIAL_IMAGE.WIDTH))
    await expect(page.locator('head > meta[property="og:image:height"]')).toHaveAttribute("content", String(SOCIAL_IMAGE.HEIGHT))

    const response = await request.get(new URL(image ?? "").pathname)
    const png = await response.body()
    expect(response.status()).toBe(HTTP_STATUS.OK)
    expect(response.headers()["content-type"]).toBe(SOCIAL_IMAGE.TYPE)
    expect([png.readUInt32BE(PNG_WIDTH_OFFSET), png.readUInt32BE(PNG_HEIGHT_OFFSET)]).toStrictEqual([SOCIAL_IMAGE.WIDTH, SOCIAL_IMAGE.HEIGHT])
  })
}
