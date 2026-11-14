import { globSync, readFileSync } from "node:fs"
import { basename, join } from "node:path"

import { HTTP_STATUS } from "../../src/modules/_core/constants/api"
import { readPageHead } from "../../src/lib/page-head"
import { SITEMAP_PATH, SOCIAL_IMAGE } from "../../src/lib/seo"
import { listedPages } from "../../src/lib/sitemap"
import { APP_URL } from "../../src/presentation/branding"
import { ROUTES } from "../../src/routes"
import { expect, test } from "../fixtures/test"

const CLIENT_DIR = "dist/client"
const LOCATION = /<loc>(?<url>[^<]+)<\/loc>/gu
const PNG_WIDTH_OFFSET = 16
const PNG_HEIGHT_OFFSET = 20
const REQUESTS_AT_ONCE = 16

const BLOG_POST = `${ROUTES.BLOG}/${basename(globSync("content/blog/*.en-US.mdx").toSorted()[0] ?? "", ".en-US.mdx")}`
const DOCS_PAGE = `${ROUTES.DOCS}/conventions/files-and-naming`
const SHARED_PAGES = [ROUTES.HOME, DOCS_PAGE, BLOG_POST].flatMap((path) => [path, `/ja-JP${path === ROUTES.HOME ? "" : path}`])

const readSitemap = async (request: { get: (path: string) => Promise<{ status: () => number; text: () => Promise<string> }> }) => {
  const response = await request.get(SITEMAP_PATH)
  expect(response.status()).toBe(HTTP_STATUS.OK)
  return Array.from((await response.text()).matchAll(LOCATION), (match) => match.groups?.["url"] ?? "")
}

test("the sitemap lists every prerendered page that allows indexing and nothing else", async ({ request }) => {
  const listed = await readSitemap(request)
  const pages = globSync("**/index.html", { cwd: CLIENT_DIR }).map((file) => readPageHead(readFileSync(join(CLIENT_DIR, file), "utf8")))
  const expected = listedPages(pages, readFileSync("public/robots.txt", "utf8")).map(({ canonical }) => canonical)

  expect(listed.toSorted()).toStrictEqual(expected.toSorted())
  expect(listed).toContain(`${APP_URL}${ROUTES.HOME}`)
  expect(listed).toContain(`${APP_URL}/ja-JP${DOCS_PAGE}`)
  expect(listed).not.toContain(`${APP_URL}${ROUTES.PREMIUM}`)
})

test("every sitemap URL answers 200 on the built site without a redirect", async ({ request }) => {
  const listed = await readSitemap(request)

  for (let start = 0; start < listed.length; start += REQUESTS_AT_ONCE) {
    const batch = listed.slice(start, start + REQUESTS_AT_ONCE)
    const statuses = await Promise.all(batch.map(async (url) => [url, (await request.get(new URL(url).pathname, { maxRedirects: 0 })).status()]))
    expect(statuses.filter(([, status]) => status !== HTTP_STATUS.OK)).toStrictEqual([])
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

test("a page that is not prerendered shares the site card", async ({ page, request }) => {
  await page.goto(ROUTES.SIGN_IN)
  await expect(page.locator('head > meta[property="og:image"]')).toHaveAttribute("content", `${APP_URL}${SOCIAL_IMAGE.SITE_PATH}`)
  expect((await request.get(SOCIAL_IMAGE.SITE_PATH)).status()).toBe(HTTP_STATUS.OK)
})
