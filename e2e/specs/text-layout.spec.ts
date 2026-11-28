import type { Page } from "@playwright/test"

import labels from "../../messages/en-US/pages.admin.json" with { type: "json" }
import { MARKETING_SECTION_IDS } from "../../src/data/navigation.constants"
import { I18N } from "../../src/integrations/use-intl/i18n.config"
import { ROUTES } from "../../src/routes"
import { TEST_ACCOUNTS, TEST_PASSWORD } from "../data/accounts"
import { TEST_COURSE, TEST_LESSONS } from "../data/courses"
import { TEST_MACHINES_LICENSE } from "../data/licenses"
import { PHONE_VIEWPORT, TEXT_LAYOUT_VIEWPORTS } from "../data/viewports"
import { expect, test } from "../fixtures/auth"
import { textLayoutProblems } from "../fixtures/text-layout"
import type { AuthPage } from "../pages"
import { APP_NAVIGATION_WAIT_UNTIL } from "../pages/base-page"

const [admin] = TEST_ACCOUNTS

const [lessonWithVideo, , , lessonWithoutVideo] = TEST_LESSONS

const ADMIN_PAGES = [
  `${ROUTES.ADMIN.COURSES.INDEX}/${TEST_COURSE.id}`,
  `${ROUTES.ADMIN.COURSES.INDEX}/${TEST_COURSE.id}/lessons/${lessonWithVideo.id}`,
  `${ROUTES.ADMIN.COURSES.INDEX}/${TEST_COURSE.id}/lessons/${lessonWithoutVideo.id}`,
  ROUTES.ADMIN.COURSES.INDEX,
  ROUTES.ADMIN.USERS.ALL,
  ROUTES.ADMIN.USERS.CUSTOMERS,
  ROUTES.ADMIN.USERS.INVITATIONS,
  `${ROUTES.ADMIN.USERS.INDEX}/${TEST_MACHINES_LICENSE.user.id}`,
  ROUTES.ADMIN.ORDERS,
  ROUTES.ADMIN.PRODUCTS,
] as const

const PAGE_LAYOUT_TIMEOUT_MS = 5_000

const GRID_PAGES = [
  ROUTES.ADMIN.INDEX,
  ROUTES.ADMIN.COURSES.INDEX,
  ROUTES.ADMIN.USERS.ALL,
  ROUTES.ADMIN.USERS.CUSTOMERS,
  ROUTES.ADMIN.USERS.INVITATIONS,
  ROUTES.ADMIN.ORDERS,
  ROUTES.ADMIN.PRODUCTS,
  `${ROUTES.ADMIN.PRODUCTS}?tab=categories`,
  `${ROUTES.ADMIN.PRODUCTS}?tab=collections`,
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
  test.setTimeout(Math.max(test.info().timeout, ADMIN_PAGES.length * TEXT_LAYOUT_VIEWPORTS.length * PAGE_LAYOUT_TIMEOUT_MS))
  await signInAsAdmin(page, authPage)

  for (const viewport of TEXT_LAYOUT_VIEWPORTS) {
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

const overflowingHeaders = (page: Page): Promise<string[]> =>
  page
    .locator("[data-slot=data-grid-header-label]")
    .evaluateAll((labels) => labels.filter((label) => label.scrollWidth > label.clientWidth).map((label) => label.textContent))

test("every admin grid fits each header label in its column on one line, in every locale, on a phone, where no column takes the room left over", async ({
  appPage,
  authPage,
  page,
}) => {
  test.setTimeout(Math.max(test.info().timeout, GRID_PAGES.length * I18N.SUPPORTED_LOCALES.length * PAGE_LAYOUT_TIMEOUT_MS))
  await signInAsAdmin(page, authPage)
  await page.setViewportSize(PHONE_VIEWPORT)

  for (const locale of I18N.SUPPORTED_LOCALES) {
    const prefix = locale === I18N.DEFAULT_LOCALE ? "" : `/${locale}`
    for (const path of GRID_PAGES) {
      await page.goto(`${prefix}${path}`, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
      await appPage.waitForAppReady()
      await expect(page.locator("[data-slot=data-grid-header-label]").first()).toBeVisible()
      await fontsLoaded(page)

      expect(await overflowingHeaders(page), `${path} in ${locale}`).toStrictEqual([])
    }
  }
})

test("the admin course form keeps one language control, and its list reaches every language, at every width", async ({ appPage, authPage, page }) => {
  await signInAsAdmin(page, authPage)

  for (const viewport of TEXT_LAYOUT_VIEWPORTS) {
    await page.setViewportSize(viewport)
    await page.goto(`${ROUTES.ADMIN.COURSES.INDEX}/${TEST_COURSE.id}`, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()
    await expect(page.getByRole("tablist")).toHaveCount(0)
    const picker = page.getByRole("button", { name: new RegExp(labels.components.formLanguages.label, "u") })
    await picker.scrollIntoViewIfNeeded()
    await expect(picker).toBeInViewport({ ratio: 1 })
    await expect(page.getByRole("button", { name: labels.components.formLanguages.panel.open })).toBeInViewport({ ratio: 1 })

    await picker.click()
    await expect(page.getByRole("option")).toHaveCount(I18N.SUPPORTED_LOCALES.length)
    await expect(page.getByRole("listbox")).toBeInViewport({ ratio: 1 })
    await page.keyboard.press("Escape")
  }
})

test("the landing page's command builder keeps every option and label whole, clear of the others and inside the window", async ({ page }) => {
  const builder = page.locator(`#${MARKETING_SECTION_IDS.CLI}`)

  for (const viewport of TEXT_LAYOUT_VIEWPORTS) {
    await page.setViewportSize(viewport)
    await page.goto("/", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await builder.scrollIntoViewIfNeeded()
    await expect(builder.getByRole("radiogroup").first()).toBeVisible()
    await fontsLoaded(page)

    expect(await textLayoutProblems(builder), `command builder at ${String(viewport.width)}px`).toStrictEqual(CLEAR)
  }
})

test("the landing page's command builder fits every question label in its column, in every locale", async ({ page }) => {
  const builder = page.locator(`#${MARKETING_SECTION_IDS.CLI}`)
  await page.setViewportSize(TEXT_LAYOUT_VIEWPORTS[0])

  for (const locale of I18N.SUPPORTED_LOCALES) {
    await page.goto(locale === I18N.DEFAULT_LOCALE ? "/" : `/${locale}`, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await builder.scrollIntoViewIfNeeded()
    await expect(builder.getByRole("radiogroup").first()).toBeVisible()
    await fontsLoaded(page)

    const cutLabels = await builder
      .locator("dt")
      .evaluateAll((labels) => labels.filter((label) => label.scrollWidth > label.clientWidth).map((label) => label.textContent))
    expect(cutLabels, locale).toStrictEqual([])
  }
})
