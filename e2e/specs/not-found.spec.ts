import type { Page } from "@playwright/test"

import type { SupportedLocale } from "../../src/integrations/use-intl/i18n.config"
import { localizePathname } from "../../src/integrations/use-intl/i18n.paths"
import { HTTP_STATUS } from "../../src/modules/_core/constants/api"
import { ROBOTS, buildTitle } from "../../src/lib/seo"
import * as ROUTES from "../../src/routes"
import enCommon from "../../messages/en-US/common.json" with { type: "json" }
import enNotFound from "../../messages/en-US/errors.not-found.json" with { type: "json" }
import plCommon from "../../messages/pl-PL/common.json" with { type: "json" }
import plNotFound from "../../messages/pl-PL/errors.not-found.json" with { type: "json" }
import { TEST_COURSE } from "../data/courses"
import { COLOR_SCHEMES, accessibilityViolations } from "../fixtures/accessibility"
import { expect, test } from "../fixtures/test"
import { APP_NAVIGATION_WAIT_UNTIL, BasePage } from "../pages/base-page"

const POLISH = "pl-PL"
const MISSING = "this-page-does-not-exist"

const COPY = {
  "en-US": { backHome: enCommon.backHome, title: enNotFound.metadata.title },
  "pl-PL": { backHome: plCommon.backHome, title: plNotFound.metadata.title },
} as const satisfies Partial<Record<SupportedLocale, { backHome: string; title: string }>>

const MISSING_PAGES = [
  { locale: "en-US", path: `/${MISSING}` },
  { locale: "en-US", path: `/${MISSING}/deeper/still` },
  { locale: POLISH, path: localizePathname({ locale: POLISH, pathname: `/${MISSING}` }) },
  { locale: "en-US", path: `${ROUTES.AUTH}/${MISSING}` },
  { locale: "en-US", path: `${ROUTES.APP}/${MISSING}` },
  { locale: "en-US", path: `${ROUTES.BLOG}/${MISSING}` },
  { locale: POLISH, path: localizePathname({ locale: POLISH, pathname: `${ROUTES.BLOG}/${MISSING}` }) },
  { locale: "en-US", path: `${ROUTES.COURSES}/${MISSING}` },
  { locale: "en-US", path: `${ROUTES.COURSES}/${TEST_COURSE.slug}/${MISSING}` },
  { locale: "en-US", path: `${ROUTES.DOCS}/${MISSING}` },
] as const

const visit = async (page: Page, path: string): Promise<number | undefined> => {
  const response = await page.goto(path, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await new BasePage(page).waitForAppReady()
  return response?.status()
}

for (const { locale, path } of MISSING_PAGES) {
  test(`${path} answers 404 with the one titled not-found page under the site header`, async ({ page }) => {
    const copy = COPY[locale]

    expect(await visit(page, path)).toBe(HTTP_STATUS.NOT_FOUND)

    await expect(page).toHaveTitle(buildTitle({ locale, title: copy.title }))
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", ROBOTS.NOINDEX)
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0)
    await expect(page.getByRole("banner")).toHaveCount(1)
    await expect(page.getByRole("main")).toHaveCount(1)
    await expect(page.getByRole("heading", { exact: true, level: 1, name: copy.title })).toBeVisible()
    await expect(page.getByRole("link", { name: new RegExp(`^${copy.backHome}$`, "iu") })).toHaveCount(1)
    await expect(page.getByRole("main").getByRole("link", { exact: true, name: copy.backHome })).toHaveAttribute(
      "href",
      localizePathname({ locale, pathname: ROUTES.HOME }),
    )
    await expect(page.getByRole("contentinfo")).toHaveCount(1)
  })
}

test("keeps the marketing dark theme on a not-found page when the visitor's system is light", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" })
  await visit(page, `/${MISSING}`)

  expect(await page.getByRole("main").evaluate((main) => main.closest(".dark") !== null)).toBe(true)
})

for (const colorScheme of COLOR_SCHEMES) {
  test(`the not-found page meets WCAG 2.2 AA in the ${colorScheme} theme`, async ({ page }) => {
    await page.emulateMedia({ colorScheme })
    await visit(page, `/${MISSING}`)

    expect(await accessibilityViolations(page)).toEqual([])
  })
}

test("has no /premium page any more", async ({ page }) => {
  expect(await visit(page, "/premium")).toBe(HTTP_STATUS.NOT_FOUND)
  await expect(page.getByRole("heading", { exact: true, level: 1, name: enNotFound.metadata.title })).toBeVisible()
})

test("navigating to a missing page in the browser shows the same page and title", async ({ page }) => {
  await visit(page, ROUTES.BLOG)
  await page.evaluate((path) => {
    window.history.pushState({}, "", path)
    window.dispatchEvent(new PopStateEvent("popstate"))
  }, `/${MISSING}`)

  await expect(page.getByRole("heading", { exact: true, level: 1, name: enNotFound.metadata.title })).toBeVisible()
  await expect(page).toHaveTitle(buildTitle({ locale: "en-US", title: enNotFound.metadata.title }))
  await expect(page.getByRole("contentinfo")).toHaveCount(1)
})
