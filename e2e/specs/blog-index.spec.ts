import { globSync } from "node:fs"

import type { Locator, Page } from "@playwright/test"

import { HTTP_STATUS } from "../../src/modules/_core/constants/api"
import { BLOG_ARCHIVE, BLOG_SORT, FEATURED_BLOG_POSTS } from "../../src/data/blog"
import { readPageHead } from "../../src/lib/page-head"
import { APP_URL } from "../../src/presentation/branding"
import { ROUTES } from "../../src/routes"
import pagesBlog from "../../messages/en-US/pages.blog.json" with { type: "json" }
import pagesLanding from "../../messages/en-US/pages.landing.json" with { type: "json" }
import { expect, test } from "../fixtures/test"

const { archive, index } = pagesBlog
const POSTS = globSync("content/blog/*.en-US.mdx").length
const archivePath = (page: number): string => `${ROUTES.BLOG}/${BLOG_ARCHIVE.PAGE_SEGMENT}/${String(page)}`
const SECOND_PAGE = archivePath(BLOG_ARCHIVE.FIRST_PAGE + 1)
const LAST_PAGE = Math.ceil(POSTS / BLOG_ARCHIVE.PAGE_SIZE)
const WIDE = { height: 900, width: 1280 }
const [LEAD] = FEATURED_BLOG_POSTS
const HYDRATION_ERROR = /hydrat/iu
const [UPDATED_LABEL = ""] = pagesBlog.post.updated.split("<")
const PAGE_NUMBER = "{page, number}"

const archiveSection = (page: Page): Locator => page.getByRole("region", { exact: true, name: archive.title })

const archiveTitles = (page: Page): Promise<string[]> => archiveSection(page).getByRole("heading", { level: 3 }).allTextContents()

const openBlog = async (page: Page, path: string = ROUTES.BLOG): Promise<void> => {
  await page.goto(path)
  await expect(page.getByRole("searchbox", { name: archive.search })).not.toHaveAttribute("readonly")
}

test("leads the blog with the featured posts, then the latest and the recently updated posts", async ({ page }) => {
  await page.goto(ROUTES.BLOG)

  const featured = page.getByRole("region", { exact: true, name: index.featured })
  await expect(featured.getByRole("heading", { level: 3 })).toHaveCount(FEATURED_BLOG_POSTS.length)
  await expect(featured.locator("h3 a").first()).toHaveAttribute("href", `${ROUTES.BLOG}/${LEAD}`)
  await expect(featured.locator("img").first()).toHaveAttribute("fetchpriority", "high")
  await expect(page.getByRole("heading", { level: 2, name: index.latest })).toBeVisible()
  await expect(page.getByRole("heading", { level: 2, name: index.updated })).toBeVisible()
})

test("searches every post as the reader types and keeps the search in the address", async ({ page }) => {
  await openBlog(page)
  const [title = ""] = await archiveTitles(page)

  await page.getByRole("searchbox", { name: archive.search }).fill(title)

  await expect.poll(() => archiveTitles(page)).toContain(title)
  expect((await archiveTitles(page)).length).toBeLessThan(POSTS)
  await expect(page).toHaveURL((url) => url.searchParams.get("q") === title)

  await page.getByRole("button", { name: archive.clearSearch }).click()

  await expect.poll(() => archiveTitles(page)).toHaveLength(BLOG_ARCHIVE.PAGE_SIZE)
  await expect(page).toHaveURL(ROUTES.BLOG)
})

test("filters the posts by topic", async ({ page }) => {
  await openBlog(page)
  const topic = page.getByRole("radiogroup", { name: archive.topics }).getByRole("radio").nth(1)
  const label = (await topic.textContent())?.replace(/\d+$/u, "") ?? ""

  await topic.click()

  await expect(topic).toBeChecked()
  await expect(page).toHaveURL(/[?&]tag=/u)
  const rows = await archiveSection(page).locator("h3").all()
  expect(rows.length).toBeGreaterThan(0)
  for (const row of rows) {
    await expect(row.locator("xpath=..")).toContainText(label)
  }
})

test("sorts the posts by their latest update and shows that date", async ({ page }) => {
  await openBlog(page)

  await page.getByRole("radiogroup", { name: archive.sort }).getByRole("radio", { name: archive.sorts.updated }).click()

  await expect(page).toHaveURL(new RegExp(`[?&]sort=${BLOG_SORT.UPDATED}`, "u"))
  await expect(archiveSection(page).locator("time").first().locator("xpath=..")).toContainText(UPDATED_LABEL)
})

test("loads the next posts in place without moving the page", async ({ page }) => {
  await page.setViewportSize(WIDE)
  await openBlog(page)
  const more = page.getByRole("link", { name: archive.loadMore })
  await expect(more).toHaveAttribute("href", SECOND_PAGE)
  await more.scrollIntoViewIfNeeded()
  const scrolled = await page.evaluate(() => window.scrollY)

  await more.click()

  await expect.poll(() => archiveTitles(page)).toHaveLength(POSTS)
  await expect(page).toHaveURL(`${ROUTES.BLOG}?page=2`)
  await expect(more).toBeHidden()
  expect(await page.evaluate(() => window.scrollY)).toBe(scrolled)
})

test("follows the archive's pages without JavaScript", async ({ pageWithoutJavaScript }) => {
  await pageWithoutJavaScript.goto(ROUTES.BLOG)
  await expect(archiveSection(pageWithoutJavaScript).getByRole("heading", { level: 3 })).toHaveCount(BLOG_ARCHIVE.PAGE_SIZE)

  await pageWithoutJavaScript.getByRole("link", { name: archive.loadMore }).click()

  await expect(pageWithoutJavaScript).toHaveURL(SECOND_PAGE)
  await expect(pageWithoutJavaScript.getByRole("heading", { level: 1 })).toHaveText(archive.pageHeading.replace(PAGE_NUMBER, "2"))
  await expect(archiveSection(pageWithoutJavaScript).getByRole("heading", { level: 3 })).toHaveCount(POSTS - BLOG_ARCHIVE.PAGE_SIZE)

  await pageWithoutJavaScript.getByRole("link", { name: archive.newer }).click()

  await expect(pageWithoutJavaScript).toHaveURL(ROUTES.BLOG)
})

for (const prefix of ["", "/ja-JP"]) {
  test(`${prefix}${SECOND_PAGE} names its own canonical address and links the blog as its previous page`, async ({ request }) => {
    const [first, second] = await Promise.all([request.get(`${prefix}${ROUTES.BLOG}`), request.get(`${prefix}${SECOND_PAGE}`)])
    const html = await second.text()

    expect(second.status()).toBe(HTTP_STATUS.OK)
    expect(readPageHead(html).canonical).toBe(`${APP_URL}${prefix}${SECOND_PAGE}`)
    expect(html).toContain(`<link href="${APP_URL}${prefix}${ROUTES.BLOG}" rel="prev"`)
    expect(html).not.toContain('rel="next"')
    expect(await first.text()).toContain(`<link href="${APP_URL}${prefix}${SECOND_PAGE}" rel="next"`)
  })
}

test("answers an archive page that does not exist with 404", async ({ request }) => {
  for (const path of [archivePath(BLOG_ARCHIVE.FIRST_PAGE), archivePath(LAST_PAGE + 1)]) {
    expect((await request.get(path, { maxRedirects: 0 })).status(), path).toBe(HTTP_STATUS.NOT_FOUND)
  }
})

test("hydrates a filtered address onto the prerendered blog without a browser error", async ({ page }) => {
  const errors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error" || HYDRATION_ERROR.test(message.text())) errors.push(message.text())
  })
  page.on("pageerror", (error) => errors.push(error.message))

  await openBlog(page, `${ROUTES.BLOG}?sort=${BLOG_SORT.READING_TIME}&page=2`)

  await expect.poll(() => archiveTitles(page)).toHaveLength(POSTS)
  await expect(page.getByRole("radio", { name: archive.sorts["reading-time"] })).toBeChecked()
  expect(errors).toEqual([])
})

test("lists every post beside a post and marks the one being read", async ({ page }) => {
  await page.setViewportSize(WIDE)
  const path = `${ROUTES.BLOG}/${LEAD}`
  await page.goto(path)

  await page.getByRole("heading", { level: 2 }).first().scrollIntoViewIfNeeded()

  const rail = page.getByRole("navigation", { name: pagesBlog.post.rail })
  await expect(rail.getByRole("link")).toHaveCount(POSTS)
  await expect(rail.locator('a[aria-current="page"]')).toHaveAttribute("href", path)
  await expect(rail.locator('a[aria-current="page"]')).toBeInViewport()
})

test("leads the landing page's notes with the featured post and links the latest posts, before JavaScript runs", async ({ pageWithoutJavaScript }) => {
  await pageWithoutJavaScript.goto(ROUTES.HOME)

  const notes = pageWithoutJavaScript.locator("section").filter({ has: pageWithoutJavaScript.getByRole("heading", { level: 2, name: pagesLanding.notes.title }) })
  await expect(notes.locator(`h3 a[href="${ROUTES.BLOG}/${LEAD}"]`)).toHaveCount(1)
  await expect(notes.locator("img")).toHaveCount(1)
  await expect(notes.getByRole("heading", { level: 4 })).not.toHaveCount(0)
  await expect(notes.getByRole("link", { name: pagesLanding.notes.cta })).toHaveAttribute("href", ROUTES.BLOG)
})
