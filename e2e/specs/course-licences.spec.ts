import type { Page } from "@playwright/test"

import { TIER_PRICES } from "../../src/data/license"
import { HTTP_STATUS } from "../../src/modules/_core/constants/api"
import { LESSON_ACCESS } from "../../src/modules/lesson/lesson.constants"
import { LICENSE_TIER } from "../../src/modules/license/license.constants"
import * as ROUTES from "../../src/routes"
import { TEST_COURSE, TEST_LESSONS, TEST_MATERIALS } from "../data/courses"
import { expect, test } from "../fixtures/auth"
import { buyLicense } from "../fixtures/license"
import { signUpAndVerify } from "../fixtures/sign-up"
import type { BasePage } from "../pages"
import { APP_NAVIGATION_WAIT_UNTIL } from "../pages/base-page"

const [, , paid] = TEST_LESSONS
const [, , checklist] = TEST_MATERIALS
const PAID_LESSONS = TEST_LESSONS.filter(({ access }) => access === LESSON_ACCESS.PAID)
const COMPLETE_OFFER = `Complete · $${String(TIER_PRICES[LICENSE_TIER.COMPLETE])} one-time`

const lessonPath = (slug: string): string => `${ROUTES.COURSES}/${TEST_COURSE.slug}/${slug}`

const isPlaylist = (url: string): boolean => new URL(url).pathname.endsWith(".m3u8")

const recordPlaylists = (page: Page): string[] => {
  const playlists: string[] = []
  page.on("request", (request) => {
    if (isPlaylist(request.url())) {
      playlists.push(request.url())
    }
  })
  return playlists
}

const openLesson = async (appPage: BasePage, page: Page, slug: string): Promise<void> => {
  await page.goto(lessonPath(slug), { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
}

const materials = (page: Page) => page.getByRole("region", { name: "Materials" })

const expectOffered = async (page: Page): Promise<void> => {
  await expect(page.getByRole("heading", { name: "This lesson comes with Complete" })).toBeVisible()
  await expect(page.getByText(COMPLETE_OFFER, { exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: "Mark as complete" })).toHaveCount(0)
  await expect(page.locator("video")).toHaveCount(0)
}

test.describe("paid lessons for each licence", () => {
  test("an Agency licence holder opens every paid lesson, streams its recording and downloads its materials", async ({
    appPage,
    authPage,
    page,
    request,
  }) => {
    const { userId } = await signUpAndVerify({ authPage, page, request })
    await buyLicense(request, { tier: LICENSE_TIER.AGENCY, userId })

    for (const lesson of PAID_LESSONS) {
      await openLesson(appPage, page, lesson.slug)
      await expect(page.getByRole("heading", { level: 1, name: lesson.title["en-US"] })).toBeVisible()
      await expect(page.getByRole("heading", { name: "This lesson comes with Complete" })).toHaveCount(0)
      if ("videoId" in lesson) {
        await expect(page.getByRole("button", { name: "Mark as complete" })).toBeVisible()
      } else {
        await expect(page.getByText("The recording for this lesson is on its way.")).toBeVisible()
      }
    }

    const playlist = page.waitForResponse((response) => isPlaylist(response.url()))
    await openLesson(appPage, page, paid.slug)
    expect((await playlist).status()).toBe(HTTP_STATUS.OK)
    const download = await materials(page).getByRole("link", { name: checklist.title["en-US"] }).getAttribute("href")
    expect((await page.request.get(download ?? "")).status()).toBe(HTTP_STATUS.OK)
  })

  test("a Core licence holder is offered Complete on a paid lesson and receives no playlist", async ({ appPage, authPage, page, request }) => {
    const { userId } = await signUpAndVerify({ authPage, page, request })
    await buyLicense(request, { tier: LICENSE_TIER.CORE, userId })
    const playlists = recordPlaylists(page)

    await openLesson(appPage, page, paid.slug)

    await expectOffered(page)
    await expect(page.getByRole("link", { name: "Get Complete" })).toHaveAttribute(
      "href",
      `${ROUTES.APP_LICENSE}?redirect=${encodeURIComponent(lessonPath(paid.slug))}&tier=${LICENSE_TIER.COMPLETE}`,
    )
    await expect(materials(page).getByText(checklist.title["en-US"])).toBeVisible()
    await expect(materials(page).getByRole("link")).toHaveCount(0)
    expect(playlists).toStrictEqual([])
  })

  test("a refunded Complete licence no longer opens a paid lesson or its materials", async ({ appPage, authPage, page, request }) => {
    const { userId } = await signUpAndVerify({ authPage, page, request })
    const { refund } = await buyLicense(request, { tier: LICENSE_TIER.COMPLETE, userId })

    const playlist = page.waitForResponse((response) => isPlaylist(response.url()))
    await openLesson(appPage, page, paid.slug)
    expect((await playlist).status()).toBe(HTTP_STATUS.OK)
    await expect(materials(page).getByRole("link", { name: checklist.title["en-US"] })).toBeVisible()

    await refund()
    const playlists = recordPlaylists(page)
    await openLesson(appPage, page, paid.slug)

    await expectOffered(page)
    await expect(materials(page).getByText(checklist.title["en-US"])).toBeVisible()
    await expect(materials(page).getByRole("link")).toHaveCount(0)
    expect(playlists).toStrictEqual([])
  })
})
