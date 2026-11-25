import type { Locator, Page } from "@playwright/test"

import coursesNavigation from "../../messages/en-US/navigation.courses.json" with { type: "json" }
import adminCourses from "../../messages/en-US/pages.admin.courses.json" with { type: "json" }
import adminSidebar from "../../messages/en-US/pages.admin.sidebar.json" with { type: "json" }
import { LOCAL_SERVER_ORIGIN } from "../../src/data/local-server"
import { SESSION_EXPIRED_CODE } from "../../src/integrations/better-auth/auth.errors"
import { ROUTES } from "../../src/routes"
import { TEST_ACCOUNTS, TEST_PASSWORD } from "../data/accounts"
import { expect, test } from "../fixtures/auth"
import type { BasePage } from "../pages"
import { APP_NAVIGATION_WAIT_UNTIL } from "../pages/base-page"

const [admin] = TEST_ACCOUNTS

const SERVER_FUNCTION = "**/_serverFn/**"

const signInThroughTheApi = async (page: Page, baseURL: string | undefined): Promise<void> => {
  const signedIn = await page.request.post("/api/auth/sign-in/email", {
    data: { email: admin.email, password: TEST_PASSWORD },
    headers: { "CF-Connecting-IP": `2001:db8:${crypto.randomUUID().slice(0, 4)}::`, Origin: baseURL ?? LOCAL_SERVER_ORIGIN },
  })
  expect(signedIn.ok()).toBe(true)
}

const openConsole = async (page: Page, appPage: BasePage, baseURL: string | undefined): Promise<Locator> => {
  await signInThroughTheApi(page, baseURL)
  await page.goto(ROUTES.ADMIN.INDEX, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
  return page.getByRole("navigation", { exact: true, name: adminSidebar.navigationLabel })
}

const signOutElsewhere = async (page: Page): Promise<void> => {
  const signedOut = await page.request.post("/api/auth/sign-out", { data: {}, headers: { Origin: new URL(page.url()).origin } })
  expect(signedOut.ok()).toBe(true)
}

const serverFunctionRequests = (page: Page): string[] => {
  const requests: string[] = []
  page.on("request", (request) => {
    if (request.url().includes("/_serverFn/")) requests.push(request.url())
  })
  return requests
}

const holdServerFunctions = async (page: Page): Promise<() => void> => {
  const held = Promise.withResolvers<void>()
  await page.route(SERVER_FUNCTION, async (route) => {
    await held.promise
    await route.continue()
  })
  return held.resolve
}

const openEach = async (page: Page, appPage: BasePage, entries: readonly Locator[]): Promise<void> => {
  for (const entry of entries) {
    const href = await entry.getAttribute("href")
    await entry.click()
    await expect(page).toHaveURL((url) => url.pathname.startsWith(String(href)))
    await appPage.waitForAppReady()
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  }
}

const expectSessionEnded = async (page: Page, returnPath: string): Promise<void> => {
  await expect(page).toHaveURL(
    (url) => url.pathname === ROUTES.AUTH.SIGN_IN && url.searchParams.get("redirect") === returnPath && url.searchParams.get("error") === SESSION_EXPIRED_CODE,
  )
  await expect(page.getByText(admin.email, { exact: true })).toHaveCount(0)
}

test("an admin opens every console page again without a request, so returning to a page waits for nothing", async ({
  appPage,
  baseURL,
  page,
}) => {
  const sidebar = await openConsole(page, appPage, baseURL)
  const entries = await sidebar.getByRole("link").all()
  await openEach(page, appPage, entries)
  const requests = serverFunctionRequests(page)

  await openEach(page, appPage, entries)

  expect(requests).toEqual([])
})

test("hovering a console entry loads its page, so the click opens it while every server function is held", async ({ appPage, baseURL, page }) => {
  const sidebar = await openConsole(page, appPage, baseURL)
  const courses = sidebar.getByRole("link", { exact: true, name: coursesNavigation.admin.courses })
  const requests = serverFunctionRequests(page)
  await courses.hover()
  await expect.poll(() => requests.length).toBeGreaterThan(0)
  await page.waitForLoadState("networkidle")
  const release = await holdServerFunctions(page)

  await courses.click()

  await expect(page.getByRole("heading", { level: 1, name: adminCourses.title })).toBeVisible()
  release()
})

test("an admin whose session ended elsewhere is sent to sign-in by the first server function that refuses it", async ({ appPage, baseURL, page }) => {
  const sidebar = await openConsole(page, appPage, baseURL)
  await signOutElsewhere(page)

  await sidebar.getByRole("link", { exact: true, name: coursesNavigation.admin.courses }).click()

  await expectSessionEnded(page, ROUTES.ADMIN.COURSES.INDEX)
})
