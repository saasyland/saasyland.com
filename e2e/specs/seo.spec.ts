import { globSync, readFileSync } from "node:fs"
import { basename, join } from "node:path"

import { HTTP_STATUS } from "../../src/modules/_core/constants/api"
import { readPageHead } from "../../src/lib/page-head"
import { ORGANIZATION_LOGO, ORGANIZATION_STRUCTURED_DATA_HTML, PAGES_SITEMAP_PATH, SITEMAP_PATH, SOCIAL_IMAGE } from "../../src/lib/seo"
import { isIndexable, listedPages } from "../../src/lib/sitemap"
import { APP_URL } from "../../src/presentation/branding"
import * as ROUTES from "../../src/routes"
import { expect, test } from "../fixtures/test"

const CLIENT_DIR = "dist/client"
const LOCATION = /<loc>(?<url>[^<]+)<\/loc>/gu
const PNG_WIDTH_OFFSET = 16
const PNG_HEIGHT_OFFSET = 20
const REQUESTS_AT_ONCE = 16
const XML_CONTENT_TYPE = /^(?:application|text)\/xml/u

const SHARED_PAGES = [
  ROUTES.HOME,
  `${ROUTES.DOCS}/conventions/files-and-naming`,
  `${ROUTES.BLOG}/${basename(globSync("content/blog/*.en-US.mdx").toSorted()[0] ?? "", ".en-US.mdx")}`,
].flatMap((path) => [path, `/ja-JP${path === ROUTES.HOME ? "" : path}`])


type Requester = { get: (path: string) => Promise<{ status: () => number; text: () => Promise<string> }> }

const readSitemap = async (request: Requester, path: string = PAGES_SITEMAP_PATH) => {
  const response = await request.get(path)
  expect(response.status()).toBe(HTTP_STATUS.OK)
  return Array.from((await response.text()).matchAll(LOCATION), (match) => match.groups?.["url"] ?? "")
}

const readSitemaps = async (request: Requester) => {
  const sitemaps = await readSitemap(request, SITEMAP_PATH)
  const lists = await Promise.all(sitemaps.map((url) => readSitemap(request, new URL(url).pathname)))
  return lists.flat()
}

test("the sitemap index names the pages' sitemap first and every sitemap it names answers as XML", async ({ request }) => {
  const sitemaps = await readSitemap(request, SITEMAP_PATH)

  expect(sitemaps[0]).toBe(`${APP_URL}${PAGES_SITEMAP_PATH}`)
  for (const url of sitemaps) {
    const response = await request.get(new URL(url).pathname)

    expect(response.status()).toBe(HTTP_STATUS.OK)
    expect(response.headers()["content-type"]).toMatch(XML_CONTENT_TYPE)
  }
})

test("the sitemap lists every prerendered page that allows indexing and nothing else", async ({ request }) => {
  const listed = await readSitemap(request)
  const pages = globSync("**/index.html", { cwd: CLIENT_DIR }).map((file) => readPageHead(readFileSync(join(CLIENT_DIR, file), "utf8")))
  const expected = listedPages(pages, readFileSync("public/robots.txt", "utf8")).map(({ canonical }) => canonical)
  const unindexed = new Set(pages.filter(({ robots }) => !isIndexable(robots)).map(({ canonical }) => canonical))

  expect(listed.toSorted()).toStrictEqual(expected.toSorted())
  expect(listed).toContain(`${APP_URL}${ROUTES.HOME}`)
  expect(listed.filter((url) => unindexed.has(url))).toStrictEqual([])
})

test("every sitemap URL answers 200 on the built site without a redirect", async ({ request }) => {
  const listed = await readSitemaps(request)

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
