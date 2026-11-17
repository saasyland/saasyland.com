import type { Locator, Page, Request, Route } from "@playwright/test"

import errors from "../../messages/en-US/errors.global.json" with { type: "json" }
import blog from "../../messages/en-US/pages.blog.json" with { type: "json" }
import { HTTP_STATUS } from "../../src/modules/_core/constants/api"
import { ROUTES } from "../../src/routes"
import { expect, test } from "../fixtures/test"
import { APP_NAVIGATION_WAIT_UNTIL, BasePage } from "../pages/base-page"

const BLOG_CODE = /\/assets\/_site\._marketing\.blog[.-][\w.-]+\.js$/u

const RELOADS_BEFORE_THE_ERROR_PAGE = 2

const isBlogDocument = (request: Request): boolean => request.isNavigationRequest() && new URL(request.url()).pathname === ROUTES.BLOG

const recordBlogDocuments = (page: Page): Request[] => {
  const documents: Request[] = []
  page.on("request", (request) => {
    if (isBlogDocument(request)) {
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
    const documents = recordBlogDocuments(page)
    await removeBlogCodeUntilNextPageLoad(page)

    await blogLink.click()

    await expect(page).toHaveURL(ROUTES.BLOG)
    await appPage.waitForAppReady()
    await expect(page.getByRole("heading", { level: 1, name: blog.index.title })).toBeVisible()
    await expect(page.getByRole("alert").filter({ hasText: errors.title })).toHaveCount(0)
    expect(documents).toHaveLength(1)
  })

  test("lands on the page after a hover failed to preload the removed code", async ({ appPage, page }) => {
    const blogLink = await openHome(page)
    const documents = recordBlogDocuments(page)
    await removeBlogCodeUntilNextPageLoad(page)
    const preload = page.waitForResponse((response) => BLOG_CODE.test(response.url()) && response.status() === HTTP_STATUS.NOT_FOUND)

    await blogLink.hover()
    await preload
    await expect(page).toHaveURL(ROUTES.HOME)
    expect(documents).toHaveLength(0)
    await blogLink.click()

    await expect(page).toHaveURL(ROUTES.BLOG)
    await appPage.waitForAppReady()
    await expect(page.getByRole("heading", { level: 1, name: blog.index.title })).toBeVisible()
    expect(documents).toHaveLength(1)
  })

  test("shows the error page instead of loading the page again when its code is still missing", async ({ page }) => {
    const blogLink = await openHome(page)
    const documents = recordBlogDocuments(page)
    await removeBlogCode(page)

    await blogLink.click()

    await expect(page.getByRole("alert").filter({ hasText: errors.title })).toBeVisible()
    await expect(page).toHaveURL(ROUTES.BLOG)
    expect(documents).toHaveLength(RELOADS_BEFORE_THE_ERROR_PAGE)
  })
})
