import { globSync } from "node:fs"

import type { Locator, Page } from "@playwright/test"

import { HTTP_STATUS } from "../../src/modules/_core/constants/api"
import { BLOG_ARCHIVE, BLOG_FINDER_TOPICS, BLOG_SORT, FEATURED_BLOG_POSTS } from "../../src/data/blog"
import { readPageHead } from "../../src/lib/page-head"
import { APP_URL } from "../../src/presentation/branding"
import * as ROUTES from "../../src/routes"
import pagesBlog from "../../messages/en-US/pages.blog.json" with { type: "json" }
import pagesLanding from "../../messages/en-US/pages.landing.json" with { type: "json" }
import { expect, test } from "../fixtures/test"

const { archive, index } = pagesBlog
const POSTS = globSync("content/blog/*.en-US.mdx").length
const archivePath = (page: number): string => `${ROUTES.BLOG}/${BLOG_ARCHIVE.PAGE_SEGMENT}/${String(page)}`
const SECOND_PAGE = archivePath(BLOG_ARCHIVE.FIRST_PAGE + 1)
const LAST_PAGE = Math.ceil(POSTS / BLOG_ARCHIVE.PAGE_SIZE)
const WIDE = { height: 900, width: 1280 }
const PHONE = { height: 844, width: 390 }
const PANEL_TOP = 96
const PANEL_INSET_LIMIT = 8
const HEADER_HEIGHT = 64
const INDEX_MIN_HEIGHT = 128
const WINDOW_HEIGHTS = [700, 800, 900, 1100]
const FIXED_CONTROLS_FROM = 800
const WHEEL_STEP = 400
const SHOW_RESULTS = /^Show \d+ posts?$/u
const ACTIVE_FILTERS = (count: number): RegExp => new RegExp(`^${archive.filters}.*${String(count)} active$`, "u")
const [LEAD] = FEATURED_BLOG_POSTS
const HYDRATION_ERROR = /hydrat/iu
const [UPDATED_LABEL = ""] = pagesBlog.post.updated.split("<")
const PAGE_NUMBER = "{page, number}"

const archiveSection = (page: Page): Locator => page.getByRole("region", { exact: true, name: archive.title })

const archiveTitles = (page: Page): Promise<string[]> => archiveSection(page).getByRole("heading", { level: 3 }).allTextContents()

const finder = (page: Page): Locator => page.getByRole("complementary", { name: archive.finder })

const archiveHeading = (page: Page): Locator => page.getByRole("heading", { level: 2, name: archive.title })

const finderIndex = (page: Page): Locator => finder(page).getByRole("navigation", { name: pagesBlog.post.rail })

const finderControls = (page: Page): Locator[] => [
  finder(page).getByRole("searchbox", { name: archive.search }),
  finder(page).getByRole("radiogroup", { name: archive.sort }),
  finder(page).getByRole("radiogroup", { name: archive.topics }),
]

const topOf = async (locator: Locator): Promise<number> => Math.round((await locator.boundingBox())?.y ?? 0)

const heightOf = async (locator: Locator): Promise<number> => Math.round((await locator.boundingBox())?.height ?? 0)

const scrollingInFinder = (page: Page): Promise<string[]> =>
  finder(page).evaluate((aside) =>
    [aside, ...aside.querySelectorAll("*")]
      .filter((element) => ["auto", "scroll"].includes(getComputedStyle(element).overflowY) && element.scrollHeight > element.clientHeight)
      .map((element) => element.tagName),
  )

const centreOf = async (locator: Locator): Promise<{ x: number; y: number }> => {
  const box = (await locator.boundingBox()) ?? { height: 0, width: 0, x: 0, y: 0 }

  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

const scrollToFraction = (page: Page, fraction: number): Promise<void> =>
  page.evaluate((share) => {
    window.scrollTo({ behavior: "instant", top: document.documentElement.scrollHeight * share })
  }, fraction)

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

test("keeps the finder beside the posts from the featured posts through the archive", async ({ page }) => {
  await page.setViewportSize(WIDE)
  await openBlog(page)
  const search = finder(page).getByRole("searchbox", { name: archive.search })

  await expect(finder(page).getByRole("navigation", { name: pagesBlog.post.rail }).getByRole("link")).toHaveCount(POSTS)

  const top = async (): Promise<number> => Math.round((await search.boundingBox())?.y ?? 0)
  const resting: number[] = []

  for (const target of [
    page.getByRole("heading", { level: 2, name: index.latest }),
    archiveHeading(page),
    archiveSection(page).getByRole("heading", { level: 3 }).nth(BLOG_ARCHIVE.PAGE_SIZE / 2),
  ]) {
    await target.scrollIntoViewIfNeeded()
    await expect(search).toBeInViewport()
    resting.push(await top())
  }

  expect(new Set(resting).size).toBe(1)
  expect(resting[0]).toBeGreaterThanOrEqual(PANEL_TOP)
  expect(resting[0]).toBeLessThan(PANEL_TOP + PANEL_INSET_LIMIT)
})

test("keeps the search, the sort and the topics in place while the page and the finder's index scroll, and scrolls only the index", async ({ page }) => {
  await page.setViewportSize(WIDE)
  await openBlog(page)
  await archiveHeading(page).scrollIntoViewIfNeeded()
  const controls = finderControls(page)
  const list = finderIndex(page).getByRole("list")
  const resting = await Promise.all(controls.map((control) => topOf(control)))

  expect(await scrollingInFinder(page)).toEqual(["UL"])

  const { x, y } = await centreOf(controls[1] ?? list)
  await page.mouse.move(x, y)
  const scrolled = await page.evaluate(() => window.scrollY)
  await page.mouse.wheel(0, WHEEL_STEP)

  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(scrolled)
  for (const [index, control] of controls.entries()) {
    await expect(control).toBeInViewport({ ratio: 1 })
    expect(await topOf(control)).toBe(resting[index])
  }

  const listCentre = await centreOf(list)
  await page.mouse.move(listCentre.x, listCentre.y)
  const pageAt = await page.evaluate(() => window.scrollY)
  await page.mouse.wheel(0, WHEEL_STEP)

  await expect.poll(() => list.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
  expect(await page.evaluate(() => window.scrollY)).toBe(pageAt)
  await expect(finderIndex(page).getByText(String(POSTS), { exact: true })).toBeInViewport()
  for (const [index, control] of controls.entries()) {
    expect(await topOf(control)).toBe(resting[index])
  }
})

for (const height of WINDOW_HEIGHTS) {
  test(`keeps a few posts of the finder's index in view on a window ${String(height)}px high, and the controls in place from ${String(FIXED_CONTROLS_FROM)}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ height, width: WIDE.width })
    await openBlog(page)
    await archiveHeading(page).scrollIntoViewIfNeeded()

    expect(await heightOf(finderIndex(page))).toBeGreaterThanOrEqual(INDEX_MIN_HEIGHT)
    await expect(finder(page).getByRole("searchbox", { name: archive.search })).toBeInViewport({ ratio: 1 })
    await expect(finderIndex(page).getByRole("link").first()).toBeInViewport()

    if (height >= FIXED_CONTROLS_FROM) {
      expect(await scrollingInFinder(page)).toEqual(["UL"])
      for (const control of finderControls(page)) {
        await expect(control).toBeInViewport({ ratio: 1 })
      }
    }
  })
}

test("opens every topic from the finder in a popover and keeps the finder's controls the same height", async ({ page }) => {
  await page.setViewportSize(WIDE)
  await openBlog(page)
  const panel = finder(page)
  const topics = panel.getByRole("radiogroup", { name: archive.topics })
  await expect(topics.getByRole("radio")).toHaveCount(BLOG_FINDER_TOPICS + 1)
  const height = await heightOf(topics)

  await panel.getByRole("button", { name: /^Show all \d+ topics$/u }).click()

  const popover = page.getByRole("dialog", { name: archive.topics })
  const last = popover.getByRole("radio").last()
  const name = (await last.getAttribute("aria-label")) ?? ""
  await last.click()

  await expect(popover).toBeHidden()
  await expect(page).toHaveURL(/[?&]tag=/u)
  await expect(topics.getByRole("radio", { name })).toBeChecked()
  await expect(topics.getByRole("radio")).toHaveCount(BLOG_FINDER_TOPICS + 1)
  expect(await heightOf(topics)).toBe(height)
  await expect(archiveHeading(page)).toBeInViewport()
})

test("brings the reader from the featured posts to the posts a finder filter matches, and clears every filter in one press", async ({ page }) => {
  await page.setViewportSize(WIDE)
  await openBlog(page)
  const panel = finder(page)
  const topic = panel.getByRole("radiogroup", { name: archive.topics }).getByRole("radio").nth(1)
  const label = (await topic.textContent())?.replace(/\d+$/u, "") ?? ""

  await topic.click()

  await expect(page).toHaveURL(/[?&]tag=/u)
  await expect(archiveHeading(page)).toBeInViewport()
  await expect(panel.getByRole("group", { name: archive.activeFilters })).toContainText(label)
  const titles = await archiveTitles(page)
  await expect(panel.getByRole("navigation", { name: pagesBlog.post.rail }).getByRole("link")).toHaveText(titles)

  await panel.getByRole("button", { name: archive.clearAll }).click()

  await expect(page).toHaveURL(ROUTES.BLOG)
  await expect(panel.getByRole("group", { name: archive.activeFilters })).toBeHidden()
  await expect(panel.getByRole("navigation", { name: pagesBlog.post.rail }).getByRole("link")).toHaveCount(POSTS)
})

test("searches every post from an archive page and opens the blog at the matching posts", async ({ page }) => {
  await page.setViewportSize(WIDE)
  await page.goto(SECOND_PAGE)
  const panel = finder(page)
  const search = panel.getByRole("searchbox", { name: archive.search })
  await expect(search).not.toHaveAttribute("readonly")
  const title = (await panel.getByRole("navigation", { name: pagesBlog.post.rail }).getByRole("link").last().textContent()) ?? ""

  await search.fill(title)

  await expect(panel.getByRole("navigation", { name: pagesBlog.post.rail }).getByRole("link")).toContainText([title])
  await expect(page).toHaveURL(SECOND_PAGE)

  await search.press("Enter")

  await expect(page).toHaveURL((url) => url.pathname === ROUTES.BLOG && url.searchParams.get("q") === title)
  await expect.poll(() => archiveTitles(page)).toContain(title)
  await expect(archiveHeading(page)).toBeInViewport()
})

test("keeps the search under the header on a phone and filters the posts from a sheet that shows and clears the active filters", async ({ page }) => {
  await page.setViewportSize(PHONE)
  await openBlog(page)
  const bar = finder(page)

  await scrollToFraction(page, 0.5)

  await expect(bar.getByRole("searchbox", { name: archive.search })).toBeInViewport()
  await expect.poll(async () => Math.round((await bar.boundingBox())?.y ?? 0)).toBe(HEADER_HEIGHT)

  await bar.getByRole("button", { name: archive.filters }).click()
  const sheet = page.getByRole("dialog", { name: archive.filters })
  await sheet.getByRole("radio", { name: archive.sorts["reading-time"] }).click()
  await sheet.getByRole("radiogroup", { name: archive.topics }).getByRole("radio").nth(1).click()
  await sheet.getByRole("button", { name: SHOW_RESULTS }).click()

  await expect(sheet).toBeHidden()
  await expect(page).toHaveURL(new RegExp(`sort=${BLOG_SORT.READING_TIME}`, "u"))
  await expect(archiveHeading(page)).toBeInViewport()
  await expect(bar.getByRole("button", { name: ACTIVE_FILTERS(2) })).toBeVisible()
  const active = bar.getByRole("group", { name: archive.activeFilters })
  await expect(active.getByRole("button")).toHaveCount(3)
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)

  await active.getByRole("button", { name: archive.clearAll }).click()

  await expect(page).toHaveURL(ROUTES.BLOG)
  await expect(active).toBeHidden()
  await expect(bar.getByRole("button", { name: archive.filters, exact: true })).toBeVisible()
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
