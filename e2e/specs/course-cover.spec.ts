import type { Locator, Page } from "@playwright/test"
import { join } from "node:path"

import { HTTP_STATUS } from "../../src/modules/_core/constants/api"
import { COURSE_COVER_PATH_PREFIX, COURSE_COVER_STORED_TYPES } from "../../src/modules/course/course.cover"
import { VIDEO_FILES } from "../../src/modules/video/video.constants"
import { TEST_ACCOUNTS } from "../data/accounts"
import { TEST_VIDEO } from "../data/videos"
import { expect, test } from "../fixtures/auth"
import { APP_NAVIGATION_WAIT_UNTIL } from "../pages/base-page"

const [admin] = TEST_ACCOUNTS
const COVER_FILE = join(TEST_VIDEO.fixture, VIDEO_FILES.POSTER)
const COVER_SOURCE = new RegExp(`^${COURSE_COVER_PATH_PREFIX}/[\\da-f-]{36}/[\\da-f-]{36}(?:-\\d+)?\\.webp$`, "u")
const FIRST_COURSE_ROW = 1

const loadedSource = async (image: Locator): Promise<string> => {
  await image.scrollIntoViewIfNeeded()
  await expect.poll(async () => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true)
  return image.evaluate((element: HTMLImageElement) => new URL(element.currentSrc).pathname)
}

const showcaseTile = async (visitor: Page, href: string): Promise<Locator> => {
  await visitor.goto("/", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  const showcase = visitor.locator("#toolkit article").nth(1)
  await showcase.scrollIntoViewIfNeeded()
  const link = showcase.locator(`a[href="${href}"]`).first()
  await expect(link).toBeVisible()
  return showcase.locator("li").filter({ has: visitor.locator(`a[href="${href}"]`) }).first()
}

test("an administrator uploads a course cover that the catalogue, the landing page and the course page show, then removes it", async ({
  appPage,
  authPage,
  browser,
  page,
}) => {
  const suffix = crypto.randomUUID().slice(0, 8)
  const slug = `e2e-cover-${suffix}`
  const title = `Covered course ${suffix}`
  const href = `/courses/${slug}`
  await authPage.signIn(admin.email)
  await expect(page).toHaveURL(/\/admin\/?$/u)
  const visitor = await browser.newPage()
  const courseRow = page.getByRole("row").filter({ hasText: slug })

  await page.goto("/admin/courses/create", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
  await page.getByLabel("Title", { exact: true }).fill(title)
  await page.getByLabel("Summary", { exact: true }).fill("A course that exists only for this test.")
  await page.getByLabel("URL slug").fill(slug)
  await page.locator("form").getByRole("button", { name: /Status/u }).click()
  await page.getByRole("option", { exact: true, name: "Published" }).click()
  await page.getByRole("button", { name: "Create course" }).click()
  await expect(page).toHaveURL(/\/admin\/courses\/[\da-f-]{36}$/u)
  const editor = page.url()

  try {
    const card = page.locator("form").filter({ has: page.getByRole("heading", { level: 2, name: "Cover" }) })
    await expect(card.locator("[data-slot=course-cover]")).toHaveAttribute("aria-hidden", "true")
    await card.locator("input[type=file]").setInputFiles(COVER_FILE)
    await card.getByRole("button", { name: "Upload cover" }).click()
    await expect(page.getByText("Cover saved").last()).toBeVisible()
    const preview = card.getByRole("img", { name: title })
    const source = await loadedSource(preview)
    expect(source).toMatch(COVER_SOURCE)
    await expect(card.getByRole("button", { name: "Replace cover" })).toBeVisible()

    const served = await page.request.get(source)
    expect(served.status()).toBe(HTTP_STATUS.OK)
    expect(served.headers()["content-type"]).toBe(COURSE_COVER_STORED_TYPES.webp)
    expect(served.headers()["cache-control"]).toBe("public, max-age=31536000, immutable")

    await page.goto("/admin/courses", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()
    const moveUp = courseRow.getByRole("button", { name: `Move ${title} up` })
    await expect(async () => {
      if (await moveUp.isEnabled()) {
        await moveUp.click()
      }
      expect(await courseRow.evaluate((row: HTMLTableRowElement) => row.rowIndex)).toBe(FIRST_COURSE_ROW)
    }).toPass()

    await visitor.goto("/courses", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    const catalogueCard = visitor.getByRole("link", { name: new RegExp(title, "u") })
    expect(await loadedSource(catalogueCard.locator("img"))).toMatch(COVER_SOURCE)

    const tile = await showcaseTile(visitor, href)
    expect(await loadedSource(tile.locator("img").first())).toMatch(COVER_SOURCE)

    await visitor.goto(href, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    expect(await loadedSource(visitor.getByRole("img", { name: title }))).toMatch(COVER_SOURCE)
    await expect(visitor.locator('meta[property="og:image"]')).toHaveAttribute("content", new RegExp(`${COURSE_COVER_PATH_PREFIX}/`, "u"))

    await page.goto(editor, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()
    await card.getByRole("button", { name: "Remove cover" }).click()
    await expect(page.getByText("Cover removed").last()).toBeVisible()
    await expect(card.locator("[data-slot=course-cover]")).toHaveAttribute("aria-hidden", "true")

    await visitor.goto("/courses", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await expect(catalogueCard.locator("[data-slot=course-cover]")).toHaveAttribute("aria-hidden", "true")
    await expect(catalogueCard.locator("img")).toHaveCount(0)
  } finally {
    await page.goto("/admin/courses", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()
    await courseRow.getByRole("button", { name: /^Delete / }).click()
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete course" }).click()
    await expect(courseRow).toHaveCount(0)
    await visitor.close()
  }
})
