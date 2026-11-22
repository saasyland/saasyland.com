import type { Page } from "@playwright/test"

import { MARKETING_SECTION_IDS } from "../../src/data/navigation.constants"
import { ROUTES } from "../../src/routes"
import { TEST_ACCOUNTS, TEST_PASSWORD } from "../data/accounts"
import { TEST_COURSE } from "../data/courses"
import { expect, test } from "../fixtures/auth"
import { textLayoutProblems } from "../fixtures/text-layout"
import type { AuthPage } from "../pages"
import { APP_NAVIGATION_WAIT_UNTIL } from "../pages/base-page"

const [admin] = TEST_ACCOUNTS

const VIEWPORTS = [
  { height: 900, width: 1440 },
  { height: 900, width: 1280 },
  { height: 1024, width: 768 },
  { height: 844, width: 390 },
] as const

const ADMIN_PAGES = [
  `${ROUTES.ADMIN_COURSES}/${TEST_COURSE.id}`,
  ROUTES.ADMIN_COURSES,
  ROUTES.ADMIN_USERS_ALL,
  ROUTES.ADMIN_USERS_CUSTOMERS,
  ROUTES.ADMIN_ORDERS,
  ROUTES.ADMIN_PRODUCTS,
] as const

const CLEAR = { clipped: [], overflow: [], overlaps: [], truncated: [] }

const signInAsAdmin = async (page: Page, authPage: AuthPage): Promise<void> => {
  await page.setExtraHTTPHeaders({ "CF-Connecting-IP": `2001:db8:${crypto.randomUUID().slice(0, 4)}::` })
  await authPage.gotoSignIn()
  await authPage.emailField().fill(admin.email)
  await authPage.passwordField().fill(TEST_PASSWORD)
  await authPage.signInSubmitButton().click()
  await expect(page).toHaveURL(/\/admin\/?$/u)
}

const fontsLoaded = async (page: Page): Promise<void> => {
  await page.evaluate(async () => {
    await document.fonts.ready
  })
}

test("the admin course form and tables keep every line of text whole, clear of the others and inside the window", async ({ appPage, authPage, page }) => {
  await signInAsAdmin(page, authPage)

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize(viewport)
    for (const path of ADMIN_PAGES) {
      await page.goto(path, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
      await appPage.waitForAppReady()
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
      await fontsLoaded(page)

      expect(await textLayoutProblems(page.locator("body")), `${path} at ${String(viewport.width)}px`).toStrictEqual(CLEAR)
    }
  }
})

test("the admin course form shows every locale tab", async ({ appPage, authPage, page }) => {
  await signInAsAdmin(page, authPage)

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize(viewport)
    await page.goto(`${ROUTES.ADMIN_COURSES}/${TEST_COURSE.id}`, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()
    const tabList = page.getByRole("tablist").first()
    await tabList.scrollIntoViewIfNeeded()
    const tabs = tabList.getByRole("tab")

    expect(await tabs.count()).toBeGreaterThan(1)
    for (const tab of await tabs.all()) {
      await expect(tab).toBeInViewport({ ratio: 1 })
    }
  }
})

test("the landing page's command builder keeps every option and label whole, clear of the others and inside the window", async ({ page }) => {
  const builder = page.locator(`#${MARKETING_SECTION_IDS.CLI}`)

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize(viewport)
    await page.goto("/", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await builder.scrollIntoViewIfNeeded()
    await expect(builder.getByRole("radiogroup").first()).toBeVisible()
    await fontsLoaded(page)

    expect(await textLayoutProblems(builder), `command builder at ${String(viewport.width)}px`).toStrictEqual(CLEAR)
  }
})
