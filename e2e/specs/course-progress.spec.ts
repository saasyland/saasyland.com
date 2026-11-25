import type { Page, Request } from "@playwright/test"

import { MILLISECONDS_PER_SECOND } from "../../src/lib/duration"
import * as ROUTES from "../../src/routes"
import { TEST_COURSE, TEST_LESSONS } from "../data/courses"
import { TEST_VIDEO } from "../data/videos"
import { expect, test } from "../fixtures/auth"
import { signUpAndVerify } from "../fixtures/sign-up"
import type { BasePage } from "../pages"
import { APP_NAVIGATION_WAIT_UNTIL } from "../pages/base-page"

const [preview, account] = TEST_LESSONS
const SERVER_FUNCTION_PATH = "/_serverFn/"

const lessonPath = (slug: string): string => `${ROUTES.COURSES}/${TEST_COURSE.slug}/${slug}`

const openLesson = async (appPage: BasePage, page: Page, slug: string): Promise<void> => {
  await page.goto(lessonPath(slug), { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
}

const mediaTime = async (page: Page): Promise<number> => page.locator("video").evaluate((video: HTMLVideoElement) => video.currentTime)

const isProgressSave = (request: Request, lessonId: string): boolean =>
  request.method() === "POST" && new URL(request.url()).pathname.startsWith(SERVER_FUNCTION_PATH) && (request.postData() ?? "").includes(lessonId)

const trackSaves = (page: Page, lessonId: string): (() => boolean) => {
  const pending = new Set<Request>()
  let started = 0
  page.on("request", (sent) => {
    if (isProgressSave(sent, lessonId)) {
      started += 1
      pending.add(sent)
    }
  })
  page.on("requestfinished", (sent) => pending.delete(sent))
  page.on("requestfailed", (sent) => pending.delete(sent))
  return () => started > 0 && pending.size === 0
}

const setPlaying = async (page: Page, playing: boolean): Promise<void> => {
  await expect(async () => {
    await page.locator("video").evaluate(async (video: HTMLVideoElement, play: boolean) => {
      video.muted = true
      if (play) {
        await video.play()
      } else {
        video.pause()
      }
    }, playing)
  }).toPass()
}

test.describe("lesson progress", () => {
  test("a signed-in learner marks a lesson complete, and the lesson and its course show it as complete after a reload", async ({
    appPage,
    authPage,
    page,
    request,
  }) => {
    await signUpAndVerify({ authPage, page, request })
    await openLesson(appPage, page, account.slug)
    const markComplete = page.getByRole("button", { name: "Mark as complete" })
    await appPage.waitForHydration(markComplete)
    const saved = trackSaves(page, account.id)
    await markComplete.click()
    await expect.poll(saved).toBe(true)

    const completed = page.getByRole("paragraph").filter({ hasText: /^Completed$/u })
    await expect(async () => {
      await openLesson(appPage, page, account.slug)
      await expect(completed).toBeVisible({ timeout: MILLISECONDS_PER_SECOND })
    }).toPass()
    await expect(markComplete).toHaveCount(0)
    await expect(page.getByRole("link", { name: new RegExp(account.title["en-US"], "u") }).getByText("Completed", { exact: true })).toBeAttached()

    await page.goto(`${ROUTES.COURSES}/${TEST_COURSE.slug}`, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()
    await expect(page.getByText(/^1 of \d+ lessons completed$/u)).toBeVisible()
  })

  test("the position where a signed-in learner pauses is saved, and the lesson resumes there", async ({ appPage, authPage, page, request }) => {
    const [moment] = preview.keyMoments
    await signUpAndVerify({ authPage, page, request })
    await openLesson(appPage, page, preview.slug)
    await expect.poll(async () => page.locator("video").evaluate((video: HTMLVideoElement) => video.readyState)).toBeGreaterThan(0)
    await page.getByRole("region", { name: "Key moments" }).getByRole("button", { name: `0:01 ${moment.label["en-US"]}` }).click()
    await expect.poll(async () => mediaTime(page)).toBeGreaterThanOrEqual(moment.seconds)

    await setPlaying(page, true)
    const saved = trackSaves(page, preview.id)
    await setPlaying(page, false)
    await expect.poll(saved).toBe(true)

    await openLesson(appPage, page, preview.slug)
    await expect.poll(async () => mediaTime(page)).toBeGreaterThanOrEqual(moment.seconds)
    expect(await mediaTime(page)).toBeLessThan(TEST_VIDEO.durationMs / MILLISECONDS_PER_SECOND)
  })
})
