import type { Locator, Page, Request } from "@playwright/test"

import authNavigation from "../../messages/en-US/navigation.auth.json" with { type: "json" }
import { MILLISECONDS_PER_SECOND } from "../../src/lib/duration"
import { ROUTES } from "../../src/routes"
import { TEST_COURSE, TEST_LESSONS } from "../data/courses"
import { TEST_VIDEO } from "../data/videos"
import { expect, test } from "../fixtures/auth"
import { builtServerFunction } from "../fixtures/server-functions"
import { SIGN_UP_PASSWORD, signUpAndVerify } from "../fixtures/sign-up"
import type { AuthPage, BasePage } from "../pages"
import { APP_NAVIGATION_WAIT_UNTIL } from "../pages/base-page"

const [preview, account] = TEST_LESSONS
const SERVER_FUNCTION_PATH = "/_serverFn/"
const SESSION_FUNCTION = "getCurrentSession"
const NO_LESSON_COMPLETED = /^0 of \d+ lessons completed$/u
const ONE_LESSON_COMPLETED = /^1 of \d+ lessons completed$/u

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

const completedNote = (page: Page): Locator => page.getByRole("paragraph").filter({ hasText: /^Completed$/u })

const headerAccount = (page: Page): Locator =>
  page.getByRole("navigation", { name: "Primary", exact: true }).getByRole("link", { exact: true, name: authNavigation.header.account })

interface SessionChecks {
  readonly path: string
  readonly resume: () => void
}

const dropSessionChecks = async (page: Page): Promise<SessionChecks> => {
  const path = `${SERVER_FUNCTION_PATH}${(await builtServerFunction(SESSION_FUNCTION)).id}`
  let dropping = true
  await page.route(`**${path}**`, async (route) => {
    if (dropping) {
      await route.abort()
      return
    }
    await route.continue()
  })
  return {
    path,
    resume: () => {
      dropping = false
    },
  }
}

const markLessonComplete = async (appPage: BasePage, page: Page): Promise<void> => {
  await openLesson(appPage, page, account.slug)
  const markComplete = page.getByRole("button", { name: "Mark as complete" })
  await appPage.waitForHydration(markComplete)
  await markComplete.click()
  await expect(completedNote(page)).toBeVisible()
  await expect(markComplete).toHaveCount(0)
  await expect(page.getByText(ONE_LESSON_COMPLETED)).toBeVisible()
}

const signInWithForm = async (authPage: AuthPage, page: Page, email: string): Promise<void> => {
  await authPage.emailField().fill(email)
  await authPage.passwordField().fill(SIGN_UP_PASSWORD)
  await authPage.signInSubmitButton().click()
  await expect(page).toHaveURL(ROUTES.APP.INDEX)
  await authPage.waitForAppReady()
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

  test("a learner who points at Your account before the header knows the session sees the lesson marked complete at once, without a reload", async ({
    appPage,
    authPage,
    page,
    request,
  }) => {
    await signUpAndVerify({ authPage, page, request })
    const sessionChecks = await dropSessionChecks(page)
    const dropped = page.waitForEvent("requestfailed", (failed) => failed.url().includes(sessionChecks.path))
    await openLesson(appPage, page, account.slug)
    const markComplete = page.getByRole("button", { name: "Mark as complete" })
    await appPage.waitForHydration(markComplete)
    await dropped
    await page.waitForLoadState("networkidle")
    await expect(headerAccount(page)).toHaveAttribute("href", ROUTES.AUTH.SIGN_IN)

    sessionChecks.resume()
    const checked = page.waitForResponse((response) => response.url().includes(sessionChecks.path))
    await headerAccount(page).hover()
    await checked
    await expect(headerAccount(page)).toHaveAttribute("href", ROUTES.APP.INDEX)

    await markComplete.click()
    await expect(completedNote(page)).toBeVisible()
    await expect(markComplete).toHaveCount(0)
    await expect(page.getByText(ONE_LESSON_COMPLETED)).toBeVisible()
  })

  test("after signing out and signing in as another learner, no course page shows the first learner's progress", async ({
    appPage,
    authPage,
    page,
    request,
  }) => {
    const other = await signUpAndVerify({ authPage, page, request })
    await page.context().clearCookies()
    await signUpAndVerify({ authPage, page, request })
    await markLessonComplete(appPage, page)

    await headerAccount(page).click()
    await expect(page).toHaveURL(ROUTES.APP.INDEX)
    await appPage.waitForAppReady()
    await page.getByRole("button", { name: "Sign out", exact: true }).click()
    await expect(page).toHaveURL(ROUTES.AUTH.SIGN_IN)
    await authPage.waitForAppReady()
    await signInWithForm(authPage, page, other.email)

    await page.getByRole("navigation", { name: "App navigation", exact: true }).getByRole("link", { name: "Courses", exact: true }).click()
    await expect(page).toHaveURL(ROUTES.COURSES)
    await page.getByRole("link", { name: new RegExp(TEST_COURSE.title["en-US"], "u") }).first().click()
    await expect(page).toHaveURL(`${ROUTES.COURSES}/${TEST_COURSE.slug}`)
    await expect(page.getByText(NO_LESSON_COMPLETED)).toBeVisible()
    await expect(page.getByText(ONE_LESSON_COMPLETED)).toHaveCount(0)

    await page.getByRole("link", { name: new RegExp(account.title["en-US"], "u") }).first().click()
    await expect(page).toHaveURL(lessonPath(account.slug))
    await expect(page.getByRole("button", { name: "Mark as complete" })).toBeVisible()
    await expect(completedNote(page)).toHaveCount(0)
    await expect(page.getByText(ONE_LESSON_COMPLETED)).toHaveCount(0)
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
