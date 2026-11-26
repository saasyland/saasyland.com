import * as zod from "zod"

import { I18N } from "../../src/integrations/use-intl/i18n.config"
import { localizePathname } from "../../src/integrations/use-intl/i18n.paths"
import { HTTP_STATUS } from "../../src/modules/_core/constants/api"
import { ROBOTS } from "../../src/lib/seo"
import { APP_URL } from "../../src/presentation/branding"
import { ROUTES } from "../../src/routes"
import { TEST_COURSE, TEST_LESSONS } from "../data/courses"
import { expect, test } from "../fixtures/test"

const URL_ENTRY = /<url>\s*<loc>(?<url>[^<]+)<\/loc>\s*<lastmod>(?<lastmod>\d{4}-\d{2}-\d{2})<\/lastmod>/gu
const STRUCTURED_DATA = /<script type="application\/ld\+json">(?<json>[^<]+)<\/script>/gu
const XML_CONTENT_TYPE = /^application\/xml/u
const CRAWLER_USER_AGENT = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
const PENDING_BOUNDARY = "<!--$?-->"
const STREAMED_SEGMENT = '<div hidden id="S:'
const PLAYER_POSTER = 'class="media-poster-image"'

const [freeLesson, ...lockedLessons] = TEST_LESSONS
const COURSE_PATH = `${ROUTES.COURSES}/${TEST_COURSE.slug}`
const lessonPath = (slug: string): string => `${COURSE_PATH}/${slug}`

const inEveryLocale = (pathname: string): string[] =>
  I18N.SUPPORTED_LOCALES.map((locale) => `${APP_URL}${localizePathname({ locale, pathname })}`)

const courseSchema = zod.object({
  "@type": zod.literal("Course"),
  inLanguage: zod.string(),
  name: zod.string(),
  offers: zod.array(zod.object({ category: zod.string(), price: zod.number() })).nonempty(),
  provider: zod.object({ "@type": zod.literal("Organization") }),
  url: zod.string(),
})

test("the course sitemap lists the catalogue, the course and its free lesson in every locale with the day each last changed, and no lesson a visitor may not watch", async ({
  request,
}) => {
  const response = await request.get(ROUTES.SITEMAPS.COURSES)
  const entries = Object.fromEntries(Array.from((await response.text()).matchAll(URL_ENTRY), ({ groups }) => [groups?.["url"], groups?.["lastmod"]]))
  const listed = Object.keys(entries)

  expect(response.status()).toBe(HTTP_STATUS.OK)
  expect(response.headers()["content-type"]).toMatch(XML_CONTENT_TYPE)
  for (const url of [...inEveryLocale(ROUTES.COURSES), ...inEveryLocale(COURSE_PATH), ...inEveryLocale(lessonPath(freeLesson.slug))]) {
    expect(listed).toContain(url)
  }
  for (const lesson of lockedLessons) {
    expect(listed.filter((url) => url.endsWith(lessonPath(lesson.slug)))).toStrictEqual([])
  }
})

test("a course page describes its course in structured data and a lesson outside the sitemap stays out of search results", async ({
  page,
  request,
}) => {
  const html = await (await request.get(`/pl-PL${COURSE_PATH}`)).text()
  const courses = Array.from(html.matchAll(STRUCTURED_DATA), ({ groups }) => courseSchema.safeParse(JSON.parse(groups?.["json"] ?? "")).data)

  expect(courses.filter((course) => course !== undefined)).toStrictEqual([
    expect.objectContaining({ inLanguage: "pl-PL", name: TEST_COURSE.title["pl-PL"], url: `${APP_URL}/pl-PL${COURSE_PATH}` }),
  ])

  const robots = page.locator('head > meta[name="robots"]')

  await page.goto(lessonPath(freeLesson.slug))
  await expect(robots).toHaveAttribute("content", ROBOTS.NON_PRODUCTION)
  for (const lesson of lockedLessons) {
    await page.goto(lessonPath(lesson.slug))
    await expect(robots).toHaveAttribute("content", ROBOTS.NOINDEX)
  }
})

test("a crawler gets a lesson with every streamed section already in place, the player included", async ({ request }) => {
  const html = await (await request.get(lessonPath(freeLesson.slug), { headers: { "User-Agent": CRAWLER_USER_AGENT } })).text()

  expect(html).not.toContain(PENDING_BOUNDARY)
  expect(html).not.toContain(STREAMED_SEGMENT)
  expect(html).toContain(PLAYER_POSTER)
})
