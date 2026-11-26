import type { APIRequestContext, Page } from "@playwright/test"

import { ERROR_CODES } from "../../src/modules/_core/constants/errors"
import { HTTP_STATUS } from "../../src/modules/_core/constants/api"
import { ROUTES } from "../../src/routes"
import { TEST_ACCOUNTS } from "../data/accounts"
import { TEST_COURSE, TEST_LESSONS, TEST_MATERIALS } from "../data/courses"
import { expect, test } from "../fixtures/auth"
import { type ServerFunction, builtServerFunctions, callServerFunction } from "../fixtures/server-functions"
import { APP_NAVIGATION_WAIT_UNTIL } from "../pages/base-page"

const [, customer] = TEST_ACCOUNTS
const [preview] = TEST_LESSONS
const [workbook] = TEST_MATERIALS

const COURSE_MODULES = ["course", "chapter", "lesson", "lesson-attachment"] as const
const VIDEO_MODULES = ["video", "video-upload"] as const
const PUBLIC_READS: readonly string[] = ["getCatalogue", "getCourse", "getCourseShowcase", "getLesson", "getLessonPlayback"]

const guardedServerFunctions = async (modules: readonly string[]): Promise<ServerFunction[]> =>
  (await builtServerFunctions()).filter(
    ({ file, name }) => modules.some((module) => file.startsWith(`src/modules/${module}/use-cases/`)) && !PUBLIC_READS.includes(name),
  )

const expectRefused = async (request: APIRequestContext, origin: string, functions: readonly ServerFunction[], code: string) => {
  for (const serverFunction of functions) {
    expect(await callServerFunction(request, serverFunction, { origin }), serverFunction.name).toContain(`"${code}"`)
  }
}

const expectSeededCourseIntact = async (page: Page): Promise<void> => {
  const playlist = page.waitForResponse((response) => new URL(response.url()).pathname.endsWith(".m3u8"))
  const response = await page.goto(`${ROUTES.COURSES}/${TEST_COURSE.slug}/${preview.slug}`, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  expect(response?.status()).toBe(HTTP_STATUS.OK)
  expect((await playlist).status()).toBe(HTTP_STATUS.OK)
  await expect(page.getByRole("heading", { level: 1, name: preview.title["en-US"] })).toBeVisible()
  const download = await page.getByRole("region", { name: "Materials" }).getByRole("link", { name: workbook.title["en-US"] }).getAttribute("href")
  expect((await page.request.get(download ?? "")).status()).toBe(HTTP_STATUS.OK)
}

for (const { area, modules } of [
  { area: "course, chapter, lesson, material, import and export", modules: COURSE_MODULES },
  { area: "upload and video", modules: VIDEO_MODULES },
]) {
  test(`a customer and a signed-out visitor are refused by every ${area} server function, and nothing changes`, async ({
    authPage,
    baseURL,
    page,
    playwright,
  }) => {
    const origin = new URL(baseURL ?? "").origin
    const functions = await guardedServerFunctions(modules)
    expect(functions.length).toBeGreaterThan(0)

    const visitor = await playwright.request.newContext({ baseURL: origin })
    await expectRefused(visitor, origin, functions, ERROR_CODES.UNAUTHORIZED)
    await visitor.dispose()

    await authPage.signIn(customer.email)
    await expect(page).toHaveURL(ROUTES.APP.INDEX)
    await expectRefused(page.request, origin, functions, ERROR_CODES.FORBIDDEN)

    await expectSeededCourseIntact(page)
  })
}
