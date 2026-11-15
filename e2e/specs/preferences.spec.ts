import type { Page } from "@playwright/test"

import { LOCAL_SERVER_ORIGIN } from "../../src/data/local-server"
import { I18N } from "../../src/integrations/use-intl/i18n.config"
import { TEST_LICENSED_ACCOUNT, TEST_PASSWORD } from "../data/accounts"
import { TEST_LICENSE } from "../data/licenses"
import { COLOR_SCHEMES, accessibilityViolations } from "../fixtures/accessibility"
import { expect, test } from "../fixtures/auth"
import type { BasePage } from "../pages"
import { APP_NAVIGATION_WAIT_UNTIL } from "../pages/base-page"

const BROWSER_TIMEZONE = "Asia/Tokyo"

const openSettings = async (page: Page, appPage: BasePage): Promise<void> => {
  await page.goto("/app/settings", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
}

const saveAndWait = async (page: Page): Promise<void> => {
  await page.getByRole("button", { name: "Save preferences", exact: true }).click()
  await expect(page.getByText("Preferences saved.", { exact: true })).toBeVisible()
}

const activation = (page: Page) => page.getByRole("listitem").filter({ hasText: TEST_LICENSE.activation.label })

test.use({ timezoneId: BROWSER_TIMEZONE })

test.describe("display preferences", () => {
  test("a saved time zone moves every time in the app and names the zone", async ({ appPage, authPage, page }) => {
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    await page.setExtraHTTPHeaders({ "CF-Connecting-IP": `2001:db8:${crypto.randomUUID().slice(0, 4)}::` })
    await authPage.gotoSignIn()
    await authPage.emailField().fill(TEST_LICENSED_ACCOUNT.email)
    await authPage.passwordField().fill(TEST_PASSWORD)
    await authPage.signInSubmitButton().click()
    await expect(page).toHaveURL("/app")

    await openSettings(page, appPage)
    const timezone = page.getByRole("combobox", { name: "Time zone", exact: true })
    await timezone.fill("New York")
    await page.getByRole("option", { name: "New York (Eastern Time)", exact: true }).click()
    await expect(timezone).toHaveValue("New York (Eastern Time)")
    await saveAndWait(page)

    await page.goto("/app/license", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()
    await expect(activation(page)).toContainText("Activated Jan 1, 2025, 7:00 AM EST")

    await openSettings(page, appPage)
    await expect(timezone).toHaveValue("New York (Eastern Time)")
    await page.getByRole("button", { name: "Detect from this browser", exact: true }).click()
    await expect(timezone).toHaveValue("Tokyo (Japan Standard Time)")
    for (const colorScheme of COLOR_SCHEMES) {
      await page.emulateMedia({ colorScheme })
      expect(await accessibilityViolations(page)).toEqual([])
    }
    await saveAndWait(page)

    await page.getByRole("navigation", { name: "App navigation", exact: true }).getByRole("link", { name: "Licence", exact: true }).click()
    await expect(page).toHaveURL("/app/license")
    await expect(activation(page)).toContainText("Activated Jan 1, 2025, 9:00 PM GMT+9")
    expect(errors).toEqual([])
  })

  test("every locale hydrates the date and time the server printed", async ({ appPage, baseURL, page }) => {
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    const signedIn = await page.request.post("/api/auth/sign-in/email", {
      data: { email: TEST_LICENSED_ACCOUNT.email, password: TEST_PASSWORD },
      headers: { "CF-Connecting-IP": `2001:db8:${crypto.randomUUID().slice(0, 4)}::`, Origin: baseURL ?? LOCAL_SERVER_ORIGIN },
    })
    expect(signedIn.ok()).toBe(true)
    for (const locale of I18N.SUPPORTED_LOCALES) {
      const prefix = locale === I18N.DEFAULT_LOCALE ? "" : `/${locale}`
      const response = await page.goto(`${prefix}/app/license`, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
      const html = (await response?.text()) ?? ""
      await appPage.waitForAppReady()
      await appPage.waitForHydration(activation(page))
      const texts = await activation(page)
        .locator("span")
        .evaluateAll((spans) => spans.filter((span) => span.childElementCount === 0).map((span) => span.textContent ?? ""))
      expect(texts).toHaveLength(2)
      for (const text of texts) expect(html.includes(text), `${locale}: the server printed "${text}"`).toBe(true)
    }
    expect(errors).toEqual([])
  })
})
