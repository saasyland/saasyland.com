import { globSync, readFileSync } from "node:fs"
import { basename, join } from "node:path"

import type { Page } from "@playwright/test"
import { frontmatter } from "fumadocs-core/content/md/frontmatter"
import { createTranslator } from "use-intl"
import * as zod from "zod"

import { I18N, type SupportedLocale } from "../../src/integrations/use-intl/i18n.config"
import { localizePathname } from "../../src/integrations/use-intl/i18n.paths"
import { COUNTRY_HEADER, HTTP_STATUS } from "../../src/modules/_core/constants/api"
import { CURRENCY_FORMAT } from "../../src/modules/_core/constants/pricing"
import { LICENSE_TIERS } from "../../src/modules/license/license.constants"
import { PPP_TIERS } from "../../src/modules/license/license.pricing"
import { TIER_PRICES } from "../../src/data/license"
import { CONSULTING_HOURLY_RATE } from "../../src/data/marketing"
import { MARKETING_SECTION_IDS } from "../../src/data/navigation.constants"
import { readPageHead } from "../../src/lib/page-head"
import { formatPostText } from "../../src/lib/post-text"
import { SECURITY_TXT_CONTENT } from "../../src/lib/security-txt"
import { ORGANIZATION_LOGO, ORGANIZATION_STRUCTURED_DATA_HTML, PAGES_SITEMAP_PATH, SITEMAP_PATH, SOCIAL_IMAGE } from "../../src/lib/seo"
import { isIndexable, listedPages } from "../../src/lib/sitemap"
import { APP_URL } from "../../src/presentation/branding"
import { ROUTES } from "../../src/routes"
import { expect, test } from "../fixtures/test"

const CLIENT_DIR = "dist/client"
const LOCATION = /<loc>(?<url>[^<]+)<\/loc>/gu
const PNG_WIDTH_OFFSET = 16
const PNG_HEIGHT_OFFSET = 20
const REQUESTS_AT_ONCE = 16
const XML_CONTENT_TYPE = /^(?:application|text)\/xml/u
const PLAIN_TEXT_UTF8 = /^text\/plain;\s*charset=utf-8$/iu
const STRUCTURED_DATA_TYPE = /"@type":"(?<type>[^"]+)"/gu
const BLOG_POST_SLUG = basename(globSync("content/blog/*.en-US.mdx").toSorted()[0] ?? "", ".en-US.mdx")
const BLOG_POST = `${ROUTES.BLOG.INDEX}/${BLOG_POST_SLUG}`

const SHARED_PAGES = [
  ROUTES.HOME,
  `${ROUTES.DOCS.INDEX}/conventions/files-and-naming`,
  BLOG_POST,
].flatMap((path) => [path, `/ja-JP${path === ROUTES.HOME ? "" : path}`])


const [REGIONAL_COUNTRY] = PPP_TIERS[0].countries

const VISITORS = [
  { headers: {}, name: "at the regular price" },
  { headers: { [COUNTRY_HEADER]: REGIONAL_COUNTRY }, name: "with a regional discount" },
] as const

const pricingCopySchema = zod.object({
  regional: zod.object({ offer: zod.string() }),
  regularPrice: zod.string(),
  tiers: zod.record(zod.enum(LICENSE_TIERS), zod.object({ period: zod.string() })),
})

const landingCopySchema = zod.object({
  faq: zod.object({ items: zod.record(zod.string(), zod.object({ answer: zod.string() })) }),
})

const consultingCopySchema = zod.object({ consulting: zod.object({ period: zod.string() }) })

const postFaqSchema = zod.object({ faq: zod.array(zod.object({ answer: zod.string(), question: zod.string() })) })

const readCopy = (locale: SupportedLocale, namespace: string): unknown =>
  JSON.parse(readFileSync(`messages/${locale}/${namespace}.json`, "utf8"))

const collapse = (text: string): string => text.replaceAll(/\s+/gu, " ").trim()

const readerText = async (page: Page, html: string): Promise<string> =>
  collapse(
    await page.evaluate((source) => {
      const parsed = new DOMParser().parseFromString(source, "text/html")
      for (const element of parsed.querySelectorAll("script, style")) {
        element.remove()
      }
      return parsed.body.textContent
    }, html),
  )

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

test("serves security.txt as UTF-8 plain text at its well-known path, without a redirect", async ({ request }) => {
  const response = await request.get(ROUTES.WELL_KNOWN.SECURITY_TXT, { maxRedirects: 0 })

  expect(response.status()).toBe(HTTP_STATUS.OK)
  expect(response.headers()["content-type"]).toMatch(PLAIN_TEXT_UTF8)
  expect(await response.text()).toBe(SECURITY_TXT_CONTENT)
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

for (const locale of I18N.SUPPORTED_LOCALES) {
  const home = localizePathname({ locale, pathname: ROUTES.HOME })
  const pricing = pricingCopySchema.parse(readCopy(locale, "components.custom.pricing"))
  const landing = landingCopySchema.parse(readCopy(locale, "pages.landing"))
  const { consulting } = consultingCopySchema.parse(readCopy(locale, "pages.landing.pricing.license"))
  const price = (amount: number): string => new Intl.NumberFormat(locale, CURRENCY_FORMAT).format(amount)
  const offer = createTranslator({ locale, messages: { offer: pricing.regional.offer } }).markup("offer", {
    percent: () => "",
    region: () => "",
  })

  for (const visitor of VISITORS) {
    test(`${home} reads as text, ${visitor.name}, with each price beside its label and no regional copy`, async ({ page, request }) => {
      const response = await request.get(home, { headers: visitor.headers })
      const text = await readerText(page, await response.text())

      expect(response.status()).toBe(HTTP_STATUS.OK)
      expect(text).not.toContain(collapse(pricing.regularPrice))
      expect(text).not.toContain(collapse(offer))
      for (const tier of LICENSE_TIERS) {
        expect(text).toContain(collapse(`${price(TIER_PRICES[tier])} ${pricing.tiers[tier].period}`))
      }
      expect(text).toContain(collapse(`${price(CONSULTING_HOURLY_RATE)} ${consulting.period}`))
    })
  }

  test(`${home} carries every FAQ answer in its prerendered text, open or collapsed`, async ({ appPage, page, request }) => {
    const text = await readerText(page, await (await request.get(home)).text())
    await page.goto(home)
    await appPage.waitForAppReady()
    const answers = await page.locator(`#${MARKETING_SECTION_IDS.FAQ} [data-slot="accordion-content"]`).allTextContents()

    expect(answers).toHaveLength(Object.keys(landing.faq.items).length)
    for (const answer of answers) {
      expect(collapse(answer)).not.toBe("")
      expect(text).toContain(collapse(answer))
    }
  })

  const post = localizePathname({ locale, pathname: BLOG_POST })
  const { faq } = postFaqSchema.parse(frontmatter(readFileSync(`content/blog/${BLOG_POST_SLUG}.${locale}.mdx`, "utf8")).data)

  test(`${post} carries every FAQ question and answer in its prerendered text and no FAQPage in its structured data`, async ({ page, request }) => {
    const html = await (await request.get(post)).text()
    const text = await readerText(page, html)
    const types = Array.from(html.matchAll(STRUCTURED_DATA_TYPE), ({ groups }) => groups?.["type"])

    expect(types).toContain("BlogPosting")
    expect(types).not.toContain("FAQPage")
    expect(faq.length).toBeGreaterThan(0)
    for (const { answer, question } of faq) {
      expect(text).toContain(collapse(formatPostText({ locale, text: question })))
      expect(text).toContain(collapse(formatPostText({ locale, text: answer })))
    }
  })
}
