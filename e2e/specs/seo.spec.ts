import { globSync, readFileSync } from "node:fs"
import { basename, join } from "node:path"

import { frontmatter } from "fumadocs-core/content/md/frontmatter"
import * as zod from "zod"

import { I18N } from "../../src/integrations/use-intl/i18n.config"
import { localizePathname } from "../../src/integrations/use-intl/i18n.paths"
import { HTTP_STATUS } from "../../src/modules/_core/constants/api"
import { readPageHead } from "../../src/lib/page-head"
import { ORGANIZATION_STRUCTURED_DATA_HTML, SITEMAP_PATH, SOCIAL_IMAGE } from "../../src/lib/seo"
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
