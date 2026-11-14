import { ROLE_CODES } from "../../src/integrations/better-auth/auth.roles"
import { TEST_ACCOUNTS } from "../data/accounts"
import { workspacePages } from "../data/pages"
import { expect, test } from "../fixtures/test"
import { APP_NAVIGATION_WAIT_UNTIL } from "../pages/base-page"

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

      await page.goto("/admin", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
      await expect(page).toHaveURL(/\/app\/?$/u)
      await appPage.waitForAppReady()
    }
    expect(errors).toEqual([])
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
