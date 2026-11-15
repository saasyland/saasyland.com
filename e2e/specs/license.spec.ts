import { TEST_ACCOUNTS } from "../data/accounts"
import { expect, test } from "../fixtures/auth"
import { APP_NAVIGATION_WAIT_UNTIL } from "../pages/base-page"

const [, customer] = TEST_ACCOUNTS

test("customer opens the licence from the app navigation in English and Polish", async ({ appPage, authPage, page }, testInfo) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await authPage.signIn(customer.email)
  await expect(page).toHaveURL(/\/app\/?$/u)
  await appPage.waitForAppReady()

  const navigation = page.getByRole("navigation", { name: "App navigation", exact: true })
  await navigation.getByRole("link", { name: "Licence", exact: true }).click()
  await expect(page).toHaveURL(/\/app\/license$/u)
  await expect(navigation.getByRole("link", { name: "Licence", exact: true })).toHaveAttribute("aria-current", "page")
  await expect(page.getByRole("heading", { name: "Your licence", exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: "Get Core", exact: true })).toBeVisible()
  await page.screenshot({ animations: "disabled", fullPage: true, path: testInfo.outputPath("app-license-desktop.png") })

  await navigation.getByRole("link", { name: "Overview", exact: true }).click()
  await expect(page).toHaveURL(/\/app\/?$/u)
  await expect(navigation.getByRole("link", { name: "Overview", exact: true })).toHaveAttribute("aria-current", "page")

  await page.goto("/pl-PL/app", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
  const polishNavigation = page.getByRole("navigation", { name: "Nawigacja aplikacji", exact: true })
  await polishNavigation.getByRole("link", { name: "Licencja", exact: true }).click()
  await expect(page).toHaveURL(/\/pl-PL\/app\/license$/u)
  await expect(polishNavigation.getByRole("link", { name: "Licencja", exact: true })).toHaveAttribute("aria-current", "page")
  await expect(page.getByRole("heading", { name: "Twoja licencja", exact: true })).toBeVisible()
  await page.screenshot({ animations: "disabled", fullPage: true, path: testInfo.outputPath("app-license-polish.png") })
  expect(errors).toEqual([])
})

test("customer opens the licence from the mobile app sidebar and signing out protects it", async ({ appPage, authPage, page }, testInfo) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.setViewportSize({ height: 844, width: 390 })
  await authPage.signIn(customer.email)
  await expect(page).toHaveURL(/\/app\/?$/u)
  await appPage.waitForAppReady()

  const sidebar = page.getByRole("dialog", { name: "Sidebar", exact: true })
  const trigger = page.getByRole("button", { name: "Toggle Sidebar", exact: true })
  await trigger.click()
  await expect(sidebar).toBeVisible()
  await sidebar.getByRole("link", { name: "Licence", exact: true }).click()
  await expect(page).toHaveURL(/\/app\/license$/u)
  await expect(sidebar).not.toBeVisible()
  await expect(page.getByRole("heading", { name: "Your licence", exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ animations: "disabled", fullPage: true, path: testInfo.outputPath("app-license-mobile.png") })

  await trigger.click()
  await sidebar.getByRole("button", { name: "Sign out", exact: true }).click()
  await expect(page).toHaveURL(/\/auth\/sign-in$/u)
  await appPage.waitForAppReady()
  await page.goto("/app/license", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await expect(page).toHaveURL(`/auth/sign-in?redirect=${encodeURIComponent("/app/license")}`)
  await appPage.waitForAppReady()
  await expect(authPage.signInSubmitButton()).toBeEnabled()
  expect(errors).toEqual([])
})
