import assert from "node:assert/strict"

import type { Page } from "@playwright/test"
import { API_ENDPOINT, API_ERROR } from "@saasyland/stack/api"

import { LOCAL_SERVER_ORIGIN } from "../../src/data/local-server"
import { TIER_PRICES } from "../../src/data/license"
import { POLAR_DASHBOARD_HOSTS, POLAR_ORGANIZATION_SLUG } from "../../src/integrations/polar/polar.constants"
import { I18N } from "../../src/integrations/use-intl/i18n.config"
import { COUNTRY_HEADER } from "../../src/modules/_core/constants/api"
import { DEFAULT_CURRENCY_CODE } from "../../src/modules/_core/constants/pricing"
import { LICENSE_ACTIVATION_LIMITS, LICENSE_TIER, LICENSE_TIERS } from "../../src/modules/license/license.constants"
import { pppMultiplierKey, regionalPrice } from "../../src/modules/license/license.pricing"
import { SESSION_STALE_TIME_MS } from "../../src/modules/session/session.constants"
import { TEST_ACCOUNTS, TEST_PASSWORD } from "../data/accounts"
import { TEST_LICENSE, TEST_LICENSED_ACCOUNT, TEST_UNLICENSED_ORDER } from "../data/licenses"
import { TEST_POLAR } from "../data/polar-settings"
import { COLOR_SCHEMES, accessibilityViolations } from "../fixtures/accessibility"
import { expect, test } from "../fixtures/auth"
import { signUpVerifiedBuyer } from "../fixtures/buyer"
import { CLI_ACTIVATION, machineConnection, sendToApi } from "../fixtures/cli-api"
import { buyLicense } from "../fixtures/license"
import type { AuthPage, BasePage } from "../pages"
import { APP_NAVIGATION_WAIT_UNTIL } from "../pages/base-page"
import * as ROUTES from "../../src/routes"

const [admin, customer] = TEST_ACCOUNTS
const BROWSER_TIMEZONE = "Asia/Tokyo"
const REGIONAL_COUNTRY = "IN"
const KEPT_MACHINE = "Kept laptop"
const FREED_MACHINE = "Old desktop"

const openSettings = async (page: Page, appPage: BasePage): Promise<void> => {
  await page.goto("/app/settings", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
}

const saveAndWait = async (page: Page): Promise<void> => {
  await page.getByRole("button", { name: "Save preferences", exact: true }).click()
  await expect(page.getByText("Preferences saved.", { exact: true })).toBeVisible()
}

const activation = (page: Page) => page.getByRole("listitem").filter({ hasText: TEST_LICENSE.activation.label })

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

test("admin finds a paid licence order without a licence on the dashboard, linked to the order in Polar", async ({
  appPage,
  authPage,
  page,
}) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await authPage.signIn(admin.email)
  await expect(page).toHaveURL(/\/admin\/?$/u)
  await appPage.waitForAppReady()

  const heading = page.getByRole("heading", { level: 2, name: "Paid orders without a licence", exact: true })
  const panel = page.locator("section").filter({ has: heading })
  const orderLink = page.getByRole("link", { name: `Open order ${TEST_UNLICENSED_ORDER.id} in Polar`, exact: true })
  const link = panel.locator(orderLink)
  await expect(link).toHaveAttribute(
    "href",
    `https://${POLAR_DASHBOARD_HOSTS[TEST_POLAR.POLAR_SERVER]}/dashboard/${POLAR_ORGANIZATION_SLUG}/sales/${TEST_UNLICENSED_ORDER.id}`,
  )
  await expect(link).toHaveAttribute("target", "_blank")
  const row = panel.getByRole("row").filter({ has: orderLink })
  await expect(row).toContainText(TEST_UNLICENSED_ORDER.customerId)
  await expect(row).toContainText(
    new Intl.NumberFormat(I18N.DEFAULT_LOCALE, { currency: DEFAULT_CURRENCY_CODE, style: "currency" }).format(
      TIER_PRICES[TEST_UNLICENSED_ORDER.tier],
    ),
  )
  expect(errors).toEqual([])
})

test.describe("cached data when the account changes", () => {
  test("a client navigation once the cached session is stale after another account signs in shows that account's licence, not the previous one's", async ({
    appPage,
    baseURL,
    page,
  }) => {
    const navigation = page.getByRole("navigation", { name: "App navigation", exact: true })
    await page.clock.install()
    const licensedSignIn = await page.request.post("/api/auth/sign-in/email", {
      data: { email: TEST_LICENSED_ACCOUNT.email, password: TEST_PASSWORD },
      headers: { "CF-Connecting-IP": `2001:db8:${crypto.randomUUID().slice(0, 4)}::`, Origin: baseURL ?? LOCAL_SERVER_ORIGIN },
    })
    expect(licensedSignIn.ok()).toBe(true)
    await page.goto("/app/license", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()
    await expect(page.getByText(TEST_LICENSE.key, { exact: true })).toBeVisible()
    await navigation.getByRole("link", { name: "Overview", exact: true }).click()
    await expect(page).toHaveURL("/app")
    await appPage.waitForAppReady()

    const customerSignIn = await page.request.post("/api/auth/sign-in/email", {
      data: { email: customer.email, password: TEST_PASSWORD },
      headers: { "CF-Connecting-IP": `2001:db8:${crypto.randomUUID().slice(0, 4)}::`, Origin: baseURL ?? LOCAL_SERVER_ORIGIN },
    })
    expect(customerSignIn.ok()).toBe(true)
    await page.clock.fastForward(SESSION_STALE_TIME_MS)
    await navigation.getByRole("link", { name: "Licence", exact: true }).click()
    await expect(page).toHaveURL("/app/license")
    await appPage.waitForAppReady()

    await expect(page.getByRole("heading", { name: "Get your licence", exact: true })).toBeVisible()
    await expect(page.getByText(customer.email, { exact: true })).toBeVisible()
    await expect(page.getByText(TEST_LICENSE.key, { exact: true })).toHaveCount(0)
    await expect(page.getByText(TEST_LICENSED_ACCOUNT.email, { exact: true })).toHaveCount(0)
  })

  test("signing out and signing in as another account leaves none of the first account's data", async ({ appPage, authPage, page }) => {
    const navigation = page.getByRole("navigation", { name: "App navigation", exact: true })
    await page.setExtraHTTPHeaders({ "CF-Connecting-IP": `2001:db8:${crypto.randomUUID().slice(0, 4)}::` })
    await authPage.gotoSignIn()
    await authPage.emailField().fill(TEST_LICENSED_ACCOUNT.email)
    await authPage.passwordField().fill(TEST_PASSWORD)
    await authPage.signInSubmitButton().click()
    await expect(page).toHaveURL("/app")
    await appPage.waitForAppReady()
    await navigation.getByRole("link", { name: "Licence", exact: true }).click()
    await expect(page).toHaveURL("/app/license")
    await appPage.waitForAppReady()
    await expect(page.getByText(TEST_LICENSE.key, { exact: true })).toBeVisible()

    await page.getByRole("button", { name: "Sign out", exact: true }).click()
    await expect(page).toHaveURL("/auth/sign-in")
    await authPage.waitForAppReady()
    await authPage.emailField().fill(customer.email)
    await authPage.passwordField().fill(TEST_PASSWORD)
    await authPage.signInSubmitButton().click()
    await expect(page).toHaveURL("/app")
    await appPage.waitForAppReady()
    await navigation.getByRole("link", { name: "Licence", exact: true }).click()
    await expect(page).toHaveURL("/app/license")
    await appPage.waitForAppReady()

    await expect(page.getByRole("heading", { name: "Get your licence", exact: true })).toBeVisible()
    await expect(page.getByText(customer.email, { exact: true })).toBeVisible()
    await expect(page.getByText(TEST_LICENSE.key, { exact: true })).toHaveCount(0)
    await expect(page.getByText(TEST_LICENSED_ACCOUNT.email, { exact: true })).toHaveCount(0)
  })
})

test.describe("display preferences", () => {
  test.use({ timezoneId: BROWSER_TIMEZONE })

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

test.describe("a licence holder", () => {
  test("sees the tier and the status of the licence on the overview, with a link to the licence page", async ({
    appPage,
    baseURL,
    page,
    request,
  }) => {
    const { userId } = await signUpVerifiedBuyer(page, request, baseURL)
    const { refund } = await buyLicense(request, { tier: LICENSE_TIER.COMPLETE, userId })
    await page.goto(ROUTES.APP, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()

    const status = page.locator("[data-slot=card]").filter({ has: page.getByRole("heading", { level: 2, name: "Your licence" }) })
    await expect(status.getByText("Complete", { exact: true })).toBeVisible()
    await expect(status.getByText("Active", { exact: true })).toBeVisible()
    await appPage.waitForHydration(status)
    await status.getByRole("link", { name: "Manage your licence" }).click()
    await expect(page).toHaveURL(ROUTES.APP_LICENSE)
    await expect(page.getByRole("heading", { name: "Complete", exact: true })).toBeVisible()

    await refund()
    await page.goto(ROUTES.APP, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()
    await expect(status.getByText("Refunded", { exact: true })).toBeVisible()
  })

  test("frees a machine's slot on the licence page, which lowers the count, and that machine is then refused with activationNotFound", async ({
    appPage,
    baseURL,
    page,
    request,
  }) => {
    const { userId } = await signUpVerifiedBuyer(page, request, baseURL)
    const { key } = await buyLicense(request, { tier: LICENSE_TIER.CORE, userId })
    const limit = LICENSE_ACTIVATION_LIMITS[LICENSE_TIER.CORE]
    const kept = await machineConnection(key, baseURL)
    const freed = await machineConnection(key, baseURL)
    const keptActivation = await sendToApi(API_ENDPOINT.ACTIVATE, { body: { ...CLI_ACTIVATION.body, label: KEPT_MACHINE } }, kept)
    const freedActivation = await sendToApi(API_ENDPOINT.ACTIVATE, { body: { ...CLI_ACTIVATION.body, label: FREED_MACHINE } }, freed)
    assert(keptActivation.success && freedActivation.success)
    await page.goto(ROUTES.APP_LICENSE, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()
    await expect(page.getByText(`2 of ${String(limit)} in use`)).toBeVisible()

    const machine = page.getByRole("listitem").filter({ has: page.getByText(FREED_MACHINE, { exact: true }) })
    await appPage.waitForHydration(machine)
    await machine.getByRole("button", { name: "Free this slot" }).click()

    await expect(page.getByText("Slot freed.")).toBeVisible()
    await expect(page.getByText(`1 of ${String(limit)} in use`)).toBeVisible()
    await expect(page.getByText(FREED_MACHINE, { exact: true })).toHaveCount(0)
    expect(await sendToApi(API_ENDPOINT.VALIDATE, { params: { activationId: freedActivation.data.activationId } }, freed)).toStrictEqual({
      failure: { code: API_ERROR.ACTIVATION_NOT_FOUND },
      success: false,
    })
    expect(await sendToApi(API_ENDPOINT.VALIDATE, { params: { activationId: keptActivation.data.activationId } }, kept)).toMatchObject({
      success: true,
    })
  })
})

test.describe("the licence offer", () => {
  const offer = (page: Page) => page.getByRole("region", { name: "Get your licence" })

  const price = (page: Page, amount: number) => offer(page).getByText(`$${String(amount)}`, { exact: true }).filter({ visible: true })

  const openOffer = async ({ appPage, authPage, page }: { appPage: BasePage; authPage: AuthPage; page: Page }): Promise<void> => {
    await authPage.signIn(customer.email)
    await expect(page).toHaveURL(/\/app\/?$/u)
    await page.goto(ROUTES.APP_LICENSE, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()
  }

  test("shows each tier's full price outside the regional-pricing countries", async ({ appPage, authPage, page }) => {
    await openOffer({ appPage, authPage, page })

    for (const tier of LICENSE_TIERS) {
      await expect(price(page, TIER_PRICES[tier])).toHaveCount(1)
    }
    await expect(offer(page).locator("s").filter({ visible: true })).toHaveCount(0)
  })

  test.describe("in a regional-pricing country", () => {
    test.use({ extraHTTPHeaders: { [COUNTRY_HEADER]: REGIONAL_COUNTRY } })

    test("shows each tier's regional price beside its struck-through full price", async ({
      appPage,
      authPage,
      page,
    }) => {
      await openOffer({ appPage, authPage, page })

      for (const tier of LICENSE_TIERS) {
        const regional = `$${String(regionalPrice(TIER_PRICES[tier], pppMultiplierKey(REGIONAL_COUNTRY)))}`
        await expect(offer(page).getByText(regional, { exact: true }).first()).toBeVisible()
        await expect(offer(page).locator("s").filter({ hasText: `$${String(TIER_PRICES[tier])}` }).first()).toBeVisible()
      }
    })
  })
})
