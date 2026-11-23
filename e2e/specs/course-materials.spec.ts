import type { Page } from "@playwright/test"

import { HTTP_STATUS } from "../../src/modules/_core/constants/api"
import { LESSON_ATTACHMENT_FILE_TYPES, LESSON_ATTACHMENT_PATH_PREFIX } from "../../src/modules/lesson-attachment/lesson-attachment.constants"
import { TEST_ACCOUNTS } from "../data/accounts"
import { TEST_COURSE, TEST_LESSONS, TEST_MATERIALS } from "../data/courses"
import { TEST_COURSE_LEARNER } from "../data/licenses"
import { expect, test } from "../fixtures/auth"
import { APP_NAVIGATION_WAIT_UNTIL } from "../pages/base-page"

const [, customer] = TEST_ACCOUNTS
const [preview, , paid, recording] = TEST_LESSONS
const [workbook, reference, checklist] = TEST_MATERIALS

const SIGNED_DOWNLOAD = new RegExp(`^${LESSON_ATTACHMENT_PATH_PREFIX}/[\\da-z]+\\.[\\da-f]{64}/[\\da-f-]{36}/[\\w.-]+$`, "u")
const FORGED_SIGNATURE = "0".repeat(64)

const lessonPath = (slug: string): string => `/courses/${TEST_COURSE.slug}/${slug}`

const materials = (page: Page) => page.getByRole("region", { name: "Materials" })

const downloadOf = async (page: Page, title: string): Promise<string> => {
  const href = await materials(page).getByRole("link", { name: title }).getAttribute("href")
  expect(href).toMatch(SIGNED_DOWNLOAD)
  return href ?? ""
}

test.describe("lesson materials", () => {
  test.beforeEach(async ({ page }) => {
    await page.setExtraHTTPHeaders({ "CF-Connecting-IP": `2001:db8:${crypto.randomUUID().slice(0, 4)}::` })
  })

  test("a visitor downloads the materials of a free lesson through a signed, expiring path", async ({ appPage, page }) => {
    await page.goto(lessonPath(preview.slug), { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()

    const href = await downloadOf(page, workbook.title["en-US"])
    const response = await page.request.get(href)

    expect(response.status()).toBe(HTTP_STATUS.OK)
    expect(response.headers()["content-type"]).toBe(LESSON_ATTACHMENT_FILE_TYPES.pdf)
    expect(response.headers()["content-disposition"]).toBe(`attachment; filename="${workbook.fileName}"`)
    expect((await response.body()).subarray(0, 5).toString()).toBe("%PDF-")
    await expect(materials(page).getByRole("link", { name: reference.title["en-US"] })).toHaveAttribute("href", reference.url)

    const forged = await page.request.get(href.replace(/\.[\da-f]{64}\//u, `.${FORGED_SIGNATURE}/`))
    expect(forged.status()).toBe(HTTP_STATUS.FORBIDDEN)
  })

  test("a visitor and a customer without Complete see a paid lesson's materials but cannot download them", async ({
    appPage,
    authPage,
    page,
  }) => {
    await page.goto(lessonPath(paid.slug), { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()
    await expect(materials(page).getByText(checklist.title["en-US"])).toBeVisible()
    await expect(materials(page).getByRole("link")).toHaveCount(0)

    await authPage.signIn(customer.email)
    await expect(page).toHaveURL("/app")
    await page.goto(lessonPath(paid.slug), { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()
    await expect(materials(page).getByText(checklist.title["en-US"])).toBeVisible()
    await expect(materials(page).getByRole("link")).toHaveCount(0)
  })

  test("a Complete licence holder downloads a paid lesson's materials and sees a lesson being recorded", async ({
    appPage,
    authPage,
    page,
  }) => {
    await authPage.signIn(TEST_COURSE_LEARNER.email)
    await expect(page).toHaveURL("/app")
    await page.goto(lessonPath(paid.slug), { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()

    const response = await page.request.get(await downloadOf(page, checklist.title["en-US"]))
    expect(response.status()).toBe(HTTP_STATUS.OK)
    expect(response.headers()["content-disposition"]).toBe(`attachment; filename="${checklist.fileName}"`)

    const recordingPage = await page.context().newPage()
    const streams: string[] = []
    recordingPage.on("request", (request) => {
      if (new URL(request.url()).pathname.endsWith(".m3u8")) {
        streams.push(request.url())
      }
    })
    await recordingPage.goto(lessonPath(recording.slug), { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await expect(recordingPage.getByText("The recording for this lesson is on its way.")).toBeVisible()
    expect(streams).toStrictEqual([])
    await recordingPage.close()
  })
})
