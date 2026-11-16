import type { Page } from "@playwright/test"

import { TEST_ACCOUNTS, TEST_PASSWORD } from "../data/accounts"
import { expect, test } from "../fixtures/auth"
import type { AuthPage } from "../pages"
import { APP_NAVIGATION_WAIT_UNTIL } from "../pages/base-page"

const [, customer] = TEST_ACCOUNTS

const signInAsCustomer = async (page: Page, authPage: AuthPage): Promise<void> => {
  await page.locator("#sign-in-email").fill(customer.email)
  await authPage.passwordField().fill(TEST_PASSWORD)
  await authPage.signInSubmitButton().click()
}

const useOwnRateLimit = async (page: Page): Promise<void> => {
  await page.setExtraHTTPHeaders({ "CF-Connecting-IP": `2001:db8:${crypto.randomUUID().slice(0, 4)}::` })
}

test.describe("returning after sign-in", () => {
  test.beforeEach(async ({ page }) => {
    await useOwnRateLimit(page)
  })

  for (const { heading, locale } of [
    { heading: "Settings", locale: "" },
    { heading: "Ustawienia", locale: "/pl-PL" },
  ]) {
    test(`a signed-out visitor who opens ${locale}/app/settings signs in and lands back on it`, async ({ authPage, page }) => {
      await page.goto(`${locale}/app/settings`, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })

      await expect(page).toHaveURL(`${locale}/auth/sign-in?redirect=${encodeURIComponent(`${locale}/app/settings`)}`)
      await authPage.waitForAppReady()
      await signInAsCustomer(page, authPage)

      await expect(page).toHaveURL(`${locale}/app/settings`)
      await expect(page.getByRole("heading", { level: 1, name: heading, exact: true })).toBeVisible()
    })
  }

  test("the return path survives the switch from sign-in to sign-up and back", async ({ authPage, page }) => {
    await page.goto("/app/settings", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await authPage.waitForAppReady()

    await page.getByRole("main").getByRole("link", { name: "Sign up", exact: true }).click()
    await expect(page).toHaveURL(`/auth/sign-up?redirect=${encodeURIComponent("/app/settings")}`)
    await page.getByRole("main").getByRole("link", { name: "Sign in", exact: true }).click()
    await expect(page).toHaveURL(`/auth/sign-in?redirect=${encodeURIComponent("/app/settings")}`)
  })

  test("a signed-in visitor who follows a sign-in link goes straight to its return path", async ({ authPage, page }) => {
    await authPage.gotoSignIn()
    await signInAsCustomer(page, authPage)
    await expect(page).toHaveURL("/app")

    await page.goto(`/auth/sign-in?redirect=${encodeURIComponent("/app/settings")}`, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })

    await expect(page).toHaveURL("/app/settings")
    await expect(page.getByRole("heading", { level: 1, name: "Settings", exact: true })).toBeVisible()
  })

  test("a return path that leaves the site is ignored", async ({ authPage, page }) => {
    await page.goto(`/auth/sign-in?redirect=${encodeURIComponent("//evil.example/steal")}`, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await authPage.waitForAppReady()

    await signInAsCustomer(page, authPage)

    await expect(page).toHaveURL("/app")
  })
})
