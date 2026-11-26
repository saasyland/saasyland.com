import type { Locator, Page, Request, Route } from "@playwright/test"

import errors from "../../messages/en-US/errors.global.json" with { type: "json" }
import blog from "../../messages/en-US/pages.blog.json" with { type: "json" }
import { HTTP_STATUS } from "../../src/modules/_core/constants/api"
import { ROUTES } from "../../src/routes"
import { TEST_COURSE, TEST_LESSONS } from "../data/courses"
import { expect, test } from "../fixtures/test"
import { APP_NAVIGATION_WAIT_UNTIL, BasePage, turnOnDataSaver } from "../pages/base-page"

const BLOG_CODE = /\/assets\/_site\._marketing\.blog[.-][\w.-]+\.js$/u

const LESSON_CODE = /\/assets\/_site\._marketing\.courses\._course\._lesson-[\w-]+\.js$/u

const [freeLesson] = TEST_LESSONS

const LESSON = `${ROUTES.COURSES}/${TEST_COURSE.slug}/${freeLesson.slug}`

const RELOADS_BEFORE_THE_ERROR_PAGE = 2

const isDocument = (request: Request, pathname: string): boolean =>
  request.isNavigationRequest() && new URL(request.url()).pathname === pathname

const recordDocuments = (page: Page, pathname: string): Request[] => {
  const documents: Request[] = []
  page.on("request", (request) => {
    if (isDocument(request, pathname)) {
      documents.push(request)
    }
  })
  return documents
}

const answerNotFound = async (route: Route): Promise<void> => {
  await route.fulfill({ status: HTTP_STATUS.NOT_FOUND })
}

const removeBlogCode = async (page: Page): Promise<void> => {
  await page.route(BLOG_CODE, answerNotFound)
}

const removeBlogCodeUntilNextPageLoad = async (page: Page): Promise<void> => {
  let loadedAgain = false
  page.on("request", (request) => {
    loadedAgain ||= request.isNavigationRequest()
  })
  await page.route(BLOG_CODE, async (route) => (loadedAgain ? route.fallback() : answerNotFound(route)))
}

const openHome = async (page: Page): Promise<Locator> => {
  await page.addInitScript(turnOnDataSaver)
  await page.goto(ROUTES.HOME, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  const appPage = new BasePage(page)
  await appPage.waitForAppReady()
  const header = page.getByRole("banner")
  await appPage.waitForHydration(header)
  return header.getByRole("link", { exact: true, name: "Blog" })
}

test.describe("a tab opened before a deploy", () => {
  test("lands on the page a visitor clicks when the deploy removed that page's code", async ({ appPage, page }) => {
    const blogLink = await openHome(page)
    const documents = recordDocuments(page, ROUTES.BLOG.INDEX)
    await removeBlogCodeUntilNextPageLoad(page)

    await blogLink.click()

    await expect(page).toHaveURL(ROUTES.BLOG.INDEX)
    await appPage.waitForAppReady()
    await expect(page.getByRole("heading", { level: 1, name: blog.index.title })).toBeVisible()
    await expect(page.getByRole("alert").filter({ hasText: errors.title })).toHaveCount(0)
    expect(documents).toHaveLength(1)
  })

  test("lands on the page after a hover failed to preload the removed code", async ({ appPage, page }) => {
    const blogLink = await openHome(page)
    const documents = recordDocuments(page, ROUTES.BLOG.INDEX)
    await removeBlogCodeUntilNextPageLoad(page)
    const preload = page.waitForResponse((response) => BLOG_CODE.test(response.url()) && response.status() === HTTP_STATUS.NOT_FOUND)

    await blogLink.hover()
    await preload
    await expect(page).toHaveURL(ROUTES.HOME)
    expect(documents).toHaveLength(0)
    await blogLink.click()

    await expect(page).toHaveURL(ROUTES.BLOG.INDEX)
    await appPage.waitForAppReady()
    await expect(page.getByRole("heading", { level: 1, name: blog.index.title })).toBeVisible()
    expect(documents).toHaveLength(1)
  })

  test("shows the error page instead of loading the page again when its code is still missing", async ({ page }) => {
    const blogLink = await openHome(page)
    const documents = recordDocuments(page, ROUTES.BLOG.INDEX)
    await removeBlogCode(page)

    await blogLink.click()

    await expect(page.getByRole("alert").filter({ hasText: errors.title })).toBeVisible()
    await expect(page).toHaveURL(ROUTES.BLOG.INDEX)
    expect(documents).toHaveLength(RELOADS_BEFORE_THE_ERROR_PAGE)
  })
})

test.describe("a visitor leaving a page", () => {
  test("goes where they asked when leaving cancels the code the page still loads", async ({ appPage, page }) => {
    const lessons = recordDocuments(page, LESSON)
    const code = Promise.withResolvers<Route>()
    await page.route(LESSON_CODE, (route) => {
      code.resolve(route)
    })
    await page.goto(LESSON, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })

    await appPage.leaveWhileLoading(await code.promise, ROUTES.PRIVACY)

    await expect(page).toHaveURL(ROUTES.PRIVACY)
    expect(lessons).toHaveLength(1)
  })
})
