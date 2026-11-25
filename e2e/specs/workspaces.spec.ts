import type { Page } from "@playwright/test"

import { LOCAL_SERVER_ORIGIN } from "../../src/data/local-server"
import { ROLE_CODES } from "../../src/integrations/better-auth/auth.roles"
import { APP_NAME } from "../../src/presentation/branding"
import { THEME } from "../../src/presentation/theme"
import { ROUTES } from "../../src/routes"
import { TEST_ACCOUNTS, TEST_PASSWORD } from "../data/accounts"
import { workspacePages } from "../data/pages"
import { COLOR_SCHEMES, accessibilityViolations } from "../fixtures/accessibility"
import { expect, test } from "../fixtures/auth"
import { APP_NAVIGATION_WAIT_UNTIL, BasePage } from "../pages/base-page"

const PAGE_AUDIT_TIMEOUT_MS = 10_000

const POLISH_PREFIX = "/pl-PL"

const visit = async (page: Page, path: string): Promise<void> => {
  const response = await page.goto(path, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  expect(response?.ok()).toBe(true)
  await new BasePage(page).waitForAppReady()
}

const PREFERENCES = [
  { expected: "dark", stored: "dark", system: "light" },
  { expected: "light", stored: "light", system: "dark" },
  { expected: "dark", stored: "system", system: "dark" },
  { expected: "dark", stored: null, system: "dark" },
] as const

for (const preference of PREFERENCES) {
  test(`workspace applies ${preference.stored ?? "default"} theme before hydration with ${preference.system} system preference`, async ({
    baseURL,
    page,
  }) => {
    await page.emulateMedia({ colorScheme: preference.system })
    if (preference.stored !== null) {
      await page.context().addCookies([{ name: THEME.COOKIE_NAME, url: baseURL ?? LOCAL_SERVER_ORIGIN, value: preference.stored }])
    }
    await page.addInitScript(() => {
      const observer = new MutationObserver(() => {
        if (document.body) {
          document.body.dataset["themeBeforeBody"] = document.documentElement.style.colorScheme
          observer.disconnect()
        }
      })
      observer.observe(document, { childList: true, subtree: true })
    })
    await page.route("**/*", (route) => (route.request().resourceType() === "script" ? route.abort() : route.continue()))
    const account = TEST_ACCOUNTS[0]
    const signedIn = await page.request.post("/api/auth/sign-in/email", {
      data: { email: account.email, password: TEST_PASSWORD },
      headers: { "CF-Connecting-IP": `2001:db8:${crypto.randomUUID().slice(0, 4)}::`, Origin: baseURL ?? LOCAL_SERVER_ORIGIN },
    })
    expect(signedIn.ok()).toBe(true)
    for (const path of ["/app", "/admin"]) {
      await page.goto(path, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
      await expect(page).toHaveURL(new RegExp(`${path}/?$`, "u"))
      await expect(page.locator("body")).toHaveAttribute("data-theme-before-body", preference.expected)
      await expect(page.locator("html")).toHaveClass(new RegExp(`\\b${preference.expected}\\b`, "u"))
      await expect(page.locator("html")).toHaveCSS("color-scheme", preference.expected)
      await expect(page.getByRole("heading").first()).toBeVisible()
    }
  })
}


for (const account of TEST_ACCOUNTS) {
  test(`${account.role} can sign in and load the permitted workspace`, async ({ appPage, authPage, page }, testInfo) => {
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    await authPage.signIn(account.email)
    const workspace = account.role === ROLE_CODES.ADMIN ? "/admin" : "/app"
    await expect(page).toHaveURL(new RegExp(`${workspace}/?$`, "u"))
    await appPage.waitForAppReady()
    await expect(page.getByRole("heading").first()).toBeVisible()
    await expect(authPage.signInSubmitButton()).toHaveCount(0)

    if (account.role === ROLE_CODES.CUSTOMER) {
      await expect(page.getByRole("heading", { name: "Overview", exact: true })).toBeVisible()
      const navigation = page.getByRole("navigation", { name: "App navigation", exact: true })
      await expect(navigation.getByRole("link", { name: "Overview", exact: true })).toHaveAttribute("aria-current", "page")
      await expect(page.getByRole("region", { name: "Your account", exact: true })).toContainText(account.email)
      await page.screenshot({ animations: "disabled", fullPage: true, path: testInfo.outputPath("app-overview-desktop.png") })
      await page.emulateMedia({ colorScheme: "dark" })
      await expect(page.locator("html")).toHaveClass(/dark/u)
      await page.screenshot({ animations: "disabled", fullPage: true, path: testInfo.outputPath("app-overview-desktop-dark.png") })
      await page.emulateMedia({ colorScheme: "light" })
      await expect(page.locator("html")).toHaveClass(/light/u)

      await navigation.getByRole("link", { name: "Settings", exact: true }).click()
      await expect(page).toHaveURL(/\/app\/settings$/u)
      await expect(navigation.getByRole("link", { name: "Settings", exact: true })).toHaveAttribute("aria-current", "page")
      await expect(page.getByRole("heading", { level: 1, name: "Settings", exact: true })).toBeVisible()
      await page.screenshot({ animations: "disabled", fullPage: true, path: testInfo.outputPath("app-settings-desktop.png") })

      await navigation.getByRole("link", { name: "Overview", exact: true }).click()
      await expect(page).toHaveURL(/\/app\/?$/u)
      await expect(navigation.getByRole("link", { name: "Overview", exact: true })).toHaveAttribute("aria-current", "page")
    }

    for (const { heading, path } of workspacePages(account.role)) {
      await page.goto(path, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
      await appPage.waitForAppReady()
      await expect(page.getByRole("heading").first()).toBeVisible()
      await expect(page.getByRole("alert").filter({ hasText: "Something went wrong" })).toHaveCount(0)
      await expect(page.getByText("Page not found", { exact: true })).toHaveCount(0)
      if (heading !== undefined) await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading)
      await page.waitForLoadState("networkidle")
    }
    if (account.role === ROLE_CODES.CUSTOMER) {
      await page.goto("/pl-PL/app", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
      await appPage.waitForAppReady()
      await expect(page.getByRole("heading").first()).toBeVisible()
      const navigation = page.getByRole("navigation", { name: "Nawigacja aplikacji", exact: true })
      await expect(navigation.getByRole("link", { name: "Przegląd", exact: true })).toHaveAttribute("aria-current", "page")
      await navigation.getByRole("link", { name: "Ustawienia", exact: true }).click()
      await expect(page).toHaveURL(/\/pl-PL\/app\/settings$/u)
      await expect(navigation.getByRole("link", { name: "Ustawienia", exact: true })).toHaveAttribute("aria-current", "page")
      await expect(page.getByRole("heading", { level: 1, name: "Ustawienia", exact: true })).toBeVisible()
      await page.screenshot({ animations: "disabled", fullPage: true, path: testInfo.outputPath("app-settings-polish.png") })
      await page.waitForLoadState("networkidle")

      await page.goto("/admin", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
      await expect(page).toHaveURL(/\/app\/?$/u)
      await appPage.waitForAppReady()
    }
    expect(errors).toEqual([])
  })
}

for (const account of TEST_ACCOUNTS) {
  test(`the wordmark takes ${account.role} from the workspace to the home page, in English and in Polish`, async ({
    appPage,
    authPage,
    landingPage,
    page,
  }) => {
    const workspace = account.role === ROLE_CODES.ADMIN ? ROUTES.ADMIN.SETTINGS : ROUTES.APP.SETTINGS.INDEX
    await authPage.signIn(account.email)
    await appPage.waitForAppReady()

    for (const prefix of ["", POLISH_PREFIX]) {
      await visit(page, `${prefix}${workspace}`)
      const wordmark = page.getByRole("link", { exact: true, name: APP_NAME })
      await expect(wordmark).toHaveAttribute("href", prefix.length > 0 ? prefix : ROUTES.HOME)
      await wordmark.click()
      await expect(page).toHaveURL((url) => url.pathname === (prefix.length > 0 ? prefix : ROUTES.HOME))
      await appPage.waitForAppReady()
      await expect(landingPage.heroHeading()).toBeVisible()
    }
  })
}

test("customer can use the mobile app sidebar and signing out protects both app pages", async ({ appPage, authPage, page }, testInfo) => {
  const customer = TEST_ACCOUNTS[1]
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.setViewportSize({ height: 844, width: 390 })
  await authPage.signIn(customer.email)
  await expect(page).toHaveURL(/\/app\/?$/u)
  await appPage.waitForAppReady()
  await expect(page.getByRole("heading", { name: "Overview", exact: true })).toBeVisible()
  await expect(authPage.signInSubmitButton()).toHaveCount(0)

  const sidebar = page.getByRole("dialog", { name: "Sidebar", exact: true })
  const trigger = page.getByRole("button", { name: "Toggle Sidebar", exact: true })
  await expect(sidebar).not.toBeVisible()
  await page.screenshot({ animations: "disabled", fullPage: true, path: testInfo.outputPath("app-overview-mobile.png") })
  await page.emulateMedia({ colorScheme: "dark" })
  await expect(page.locator("html")).toHaveClass(/dark/u)
  await page.screenshot({ animations: "disabled", fullPage: true, path: testInfo.outputPath("app-overview-mobile-dark.png") })
  await trigger.click()
  await expect(sidebar).toBeVisible()
  await expect(sidebar).toBeInViewport({ ratio: 1 })
  await page.screenshot({ animations: "disabled", fullPage: true, path: testInfo.outputPath("app-sidebar-mobile.png") })
  await sidebar.getByRole("link", { name: "Settings", exact: true }).click()
  await expect(page).toHaveURL(/\/app\/settings$/u)
  await expect(sidebar).not.toBeVisible()
  await expect(page.getByRole("heading", { level: 1, name: "Settings", exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ animations: "disabled", fullPage: true, path: testInfo.outputPath("app-settings-mobile.png") })

  await trigger.click()
  await expect(sidebar).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(sidebar).not.toBeVisible()
  await expect(trigger).toBeFocused()

  await trigger.click()
  await sidebar.getByRole("button", { name: "Sign out", exact: true }).click()
  await expect(page).toHaveURL(/\/auth\/sign-in$/u)
  await appPage.waitForAppReady()
  await expect(authPage.signInSubmitButton()).toBeEnabled()
  for (const path of ["/app", "/app/settings"]) {
    await page.goto(path, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await expect(page).toHaveURL(`/auth/sign-in?redirect=${encodeURIComponent(path)}`)
    await appPage.waitForAppReady()
    await expect(authPage.signInSubmitButton()).toBeEnabled()
  }
  expect(errors).toEqual([])
})

for (const account of TEST_ACCOUNTS) {
  for (const colorScheme of COLOR_SCHEMES) {
    test(`${account.role} workspace pages meet WCAG 2.2 AA in the ${colorScheme} theme`, async ({ authPage, page }) => {
      const paths = workspacePages(account.role).map(({ path }) => path)
      test.setTimeout(Math.max(test.info().timeout, paths.length * PAGE_AUDIT_TIMEOUT_MS))
      await page.emulateMedia({ colorScheme })
      await authPage.signIn(account.email)
      await expect(authPage.signInSubmitButton()).toHaveCount(0)

      const violations: Record<string, string[]> = {}
      for (const path of paths) {
        await visit(page, path)
        violations[path] = await accessibilityViolations(page)
      }

      expect(violations).toEqual(Object.fromEntries(paths.map((path) => [path, []])))
    })
  }
}
