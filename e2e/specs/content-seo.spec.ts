import { globSync, readFileSync } from "node:fs"
import { basename, join } from "node:path"

import type { Page } from "@playwright/test"
import { frontmatter } from "fumadocs-core/content/md/frontmatter"
import * as zod from "zod"

import { BLOG_ARCHIVE } from "../../src/data/blog"
import { I18N } from "../../src/integrations/use-intl/i18n.config"
import { deLocalizePathname, localizePathname } from "../../src/integrations/use-intl/i18n.paths"
import { HTTP_STATUS } from "../../src/modules/_core/constants/api"
import { BLOG_FEED_TYPE, blogFeedPath } from "../../src/lib/feed"
import { readPageHead } from "../../src/lib/page-head"
import { PAGES_SITEMAP_PATH } from "../../src/lib/seo"
import { APP_URL } from "../../src/presentation/branding"
import { ROUTES } from "../../src/routes"
import { collapse, readerText } from "../fixtures/reader-text"
import { expect, test } from "../fixtures/test"

const CLIENT_DIR = "dist/client"
const LOCATION = /<loc>(?<url>[^<]+)<\/loc>/gu
const URL_ENTRY = /<url>\s*<loc>(?<url>[^<]+)<\/loc>\s*(?:<lastmod>(?<lastmod>[^<]+)<\/lastmod>)?/gu
const BLOG_POST_FILE = /^(?<slug>.+)\.(?<locale>[^.]+)\.mdx$/u
const FEED_ITEM = /<item>\s*<title>[^<]*<\/title>\s*<link>(?<link>[^<]+)<\/link>[\s\S]*?<pubDate>(?<published>[^<]+)<\/pubDate>/gu
const XML_CONTENT_TYPE = /^(?:application|text)\/xml/u
const POST_PREFIX = `${ROUTES.BLOG.INDEX}/`
const ARCHIVE_PREFIX = `${POST_PREFIX}${BLOG_ARCHIVE.PAGE_SEGMENT}/`
const UNPUBLISHED = /^published:\s*false\s*$/mu
const BLOG_POST_SLUG = basename(globSync("content/blog/*.en-US.mdx").toSorted()[0] ?? "", ".en-US.mdx")
const BLOG_POST = `${ROUTES.BLOG.INDEX}/${BLOG_POST_SLUG}`
const STRUCTURED_DATA_TYPE = /"@type":"(?<type>[^"]+)"/gu
const DOCS_PAGE = `${ROUTES.DOCS.INDEX}/conventions/files-and-naming`

const postFileSchema = zod.object({ locale: zod.enum(I18N.SUPPORTED_LOCALES), slug: zod.string() })
const postDatesSchema = zod.object({ date: zod.string(), published: zod.boolean().default(true), updated: zod.string().optional() })
const postFaqSchema = zod.object({ faq: zod.array(zod.object({ answer: zod.string(), question: zod.string() })) })

const faqEntries = async (page: Page, html: string): Promise<string[][]> =>
  page.evaluate((source) => {
    const parsed = new DOMParser().parseFromString(source, "text/html")
    return Array.from(parsed.querySelectorAll("[data-accordion-value]"), (header) => [
      header.textContent,
      header.nextElementSibling?.textContent ?? "",
    ])
  }, html)

const publishedPostDates = (): [string, string][] =>
  globSync("content/blog/*.mdx").flatMap((file) => {
    const { locale, slug } = postFileSchema.parse(BLOG_POST_FILE.exec(basename(file))?.groups)
    const { date, published, updated = date } = postDatesSchema.parse(frontmatter(readFileSync(file, "utf8")).data)
    const url = `${APP_URL}${localizePathname({ locale, pathname: `${ROUTES.BLOG.INDEX}/${slug}` })}`

    return published ? [[url, updated]] : []
  })

test("the sitemap lists the docs in every language", async ({ request }) => {
  const response = await request.get(PAGES_SITEMAP_PATH)
  const listed = Array.from((await response.text()).matchAll(LOCATION), (match) => match.groups?.["url"] ?? "")

  expect(listed).toContain(`${APP_URL}${DOCS_PAGE}`)
  expect(listed).toContain(`${APP_URL}/ja-JP${DOCS_PAGE}`)
})

test("the sitemap dates every published blog post in every locale by its last update and leaves every other page undated", async ({
  request,
}) => {
  const response = await request.get(PAGES_SITEMAP_PATH)
  const dated = Array.from((await response.text()).matchAll(URL_ENTRY), ({ groups }) => [groups?.["url"], groups?.["lastmod"]]).filter(
    ([, lastmod]) => lastmod !== undefined,
  )
  const posts = publishedPostDates()

  expect(posts.length).toBeGreaterThan(0)
  expect(Object.fromEntries(dated)).toStrictEqual(Object.fromEntries(posts))
})

for (const path of [ROUTES.BLOG.INDEX, BLOG_POST, `/ja-JP${ROUTES.BLOG.INDEX}`, `/ja-JP${BLOG_POST}`]) {
  test(`${path} names the blog feed of its own language`, async ({ page }) => {
    await page.goto(path)
    const locale = path.startsWith("/ja-JP") ? "ja-JP" : I18N.DEFAULT_LOCALE

    await expect(page.locator(`head > link[rel="alternate"][type="${BLOG_FEED_TYPE}"]`)).toHaveAttribute("href", `${APP_URL}${blogFeedPath(locale)}`)
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

for (const locale of I18N.SUPPORTED_LOCALES) {
  const post = localizePathname({ locale, pathname: BLOG_POST })
  const { faq } = postFaqSchema.parse(frontmatter(readFileSync(`content/blog/${BLOG_POST_SLUG}.${locale}.mdx`, "utf8")).data)

  test(`${post} carries every FAQ question and answer in its prerendered text and no FAQPage in its structured data`, async ({ page, request }) => {
    const html = await (await request.get(post)).text()
    const text = await readerText(page, html)
    const entries = await faqEntries(page, html)
    const types = Array.from(html.matchAll(STRUCTURED_DATA_TYPE), ({ groups }) => groups?.["type"])

    expect(types).toContain("BlogPosting")
    expect(types).not.toContain("FAQPage")
    expect(entries).toHaveLength(faq.length)
    for (const entry of entries) {
      for (const part of entry) {
        expect(collapse(part)).not.toBe("")
        expect(text).toContain(collapse(part))
      }
    }
  })
}
