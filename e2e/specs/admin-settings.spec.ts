import type { APIRequestContext, Browser, BrowserContext, Locator, Page } from "@playwright/test"

import authErrors from "../../messages/en-US/auth.errors.json" with { type: "json" }
import * as ROUTES from "../../src/routes"
import { TEST_ACCOUNTS, TEST_PASSWORD } from "../data/accounts"
import { expect, test } from "../fixtures/auth"
import { expectPasswordChangedEmail, expectVerificationEmail } from "../fixtures/emails"
import { totpCode } from "../fixtures/totp"
import { AuthPage } from "../pages"
import { APP_NAVIGATION_WAIT_UNTIL, RENDERED_LOCATION_KEY, recordRenderedLocations } from "../pages/base-page"

const [admin] = TEST_ACCOUNTS

const NEW_PASSWORD = "AdminSettings456!"
const BACKUP_CODE_COUNT = 10
const FIREFOX_ON_WINDOWS = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0"
const SAFARI_ON_IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1"

const ADMIN_HOME = /\/admin\/?$/u

interface Browsers {
  readonly baseURL: string | undefined
  readonly browser: Browser
}

interface Device {
  readonly context: BrowserContext
  readonly page: Page
}

const clientHeaders = (): Record<string, string> => ({ "CF-Connecting-IP": `2001:db8:${crypto.randomUUID().slice(0, 4)}::` })

const card = (page: Page, title: string): Locator =>
  page.locator("[data-slot=card]").filter({ has: page.getByRole("heading", { exact: true, level: 2, name: title }) })

const signInWith = async (page: Page, email: string, password = TEST_PASSWORD): Promise<void> => {
  const authPage = new AuthPage(page)
  await page.setExtraHTTPHeaders(clientHeaders())
  await authPage.gotoSignIn()
  await authPage.emailField().fill(email)
  await authPage.passwordField().fill(password)
  await authPage.signInSubmitButton().click()
}

const openDevice = async ({ baseURL, browser }: Browsers, email: string, userAgent?: string): Promise<Device> => {
  const context = await browser.newContext({ ...(baseURL === undefined ? {} : { baseURL }), ...(userAgent === undefined ? {} : { userAgent }) })
  await context.addInitScript(recordRenderedLocations, RENDERED_LOCATION_KEY)
  const page = await context.newPage()
  await signInWith(page, email)
  return { context, page }
}

const addAdmin = async (browsers: Browsers): Promise<string> => {
  const email = `settings-admin.${crypto.randomUUID()}@example.test`
  const { context, page } = await openDevice(browsers, admin.email)
  await expect(page).toHaveURL(ADMIN_HOME)
  await page.goto(ROUTES.ADMIN_USERS_ALL, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await new AuthPage(page).waitForAppReady()
  await page.getByRole("button", { exact: true, name: "Add user" }).click()
  const dialog = page.getByRole("dialog", { name: "Add user" })
  await dialog.getByRole("textbox", { name: "Name" }).fill("Settings Admin")
  await dialog.getByRole("textbox", { name: "Email" }).fill(email)
  await dialog.getByLabel("Password").fill(TEST_PASSWORD)
  await dialog.getByRole("button", { name: /Role/u }).click()
  await page.getByRole("option", { exact: true, name: "Admin" }).click()
  await dialog.getByRole("button", { exact: true, name: "Add user" }).click()
  await expect(page).toHaveURL(/\/admin\/users\/(?!all$)[^/]+$/u)
  await context.close()
  return email
}

const signInAsNewAdmin = async (
  { authPage, baseURL, browser, page, request }: Browsers & { authPage: AuthPage; page: Page; request: APIRequestContext },
): Promise<string> => {
  const email = await addAdmin({ baseURL, browser })
  await signInWith(page, email)
  await expect(page).toHaveURL(/\/auth\/verify-email\?.*unverified=true/u)
  await authPage.waitForAppReady()
  await page.goto((await expectVerificationEmail(request, email)).toString(), { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await expect(page).toHaveURL(ADMIN_HOME)
  return email
}

const openSecuritySettings = async (page: Page, authPage: AuthPage): Promise<void> => {
  await page.goto(`${ROUTES.ADMIN_SETTINGS}?tab=security`, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await authPage.waitForAppReady()
  await authPage.waitForHydration(page.getByRole("tabpanel"))
}

const expectSignedOut = async (page: Page): Promise<void> => {
  await page.goto(ROUTES.ADMIN, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await expect(page).toHaveURL(/\/auth\/sign-in/u)
}

const fillCode = async (page: Page, code: string): Promise<void> => {
  await page.getByRole("textbox", { name: /code/iu }).first().fill(code)
}

test.describe("admin security settings", () => {
  test("an admin changes their password with the current one, and only the new password signs them in", async ({
    authPage,
    baseURL,
    browser,
    page,
    request,
  }) => {
    const email = await signInAsNewAdmin({ authPage, baseURL, browser, page, request })
    await openSecuritySettings(page, authPage)

    const password = card(page, "Password")
    await password.getByLabel("Current password").fill(TEST_PASSWORD)
    await password.getByLabel("New password").fill(NEW_PASSWORD)
    await password.getByRole("button", { name: "Change password" }).click()
    await expect(page.getByText("Your password was changed, and every other device was signed out.")).toBeVisible()
    await expectPasswordChangedEmail(request, email)

    await page.context().clearCookies()
    await signInWith(page, email)
    await expect(page.getByText(authErrors.invalidEmailOrPassword)).toBeVisible()
    await signInWith(page, email, NEW_PASSWORD)
    await expect(page).toHaveURL(ADMIN_HOME)
  })

  test("an admin turns on two-factor authentication with a code and gets backup codes, then turns it off so signing in asks for no code", async ({
    authPage,
    baseURL,
    browser,
    page,
    request,
  }) => {
    const email = await signInAsNewAdmin({ authPage, baseURL, browser, page, request })
    await openSecuritySettings(page, authPage)
    const twoFactor = card(page, "Two-factor authentication")
    await expect(twoFactor.getByText("Off", { exact: true })).toBeVisible()
    await twoFactor.getByRole("button", { name: "Turn on" }).click()

    const dialog = page.getByRole("dialog", { name: "Turn on two-factor authentication" })
    await dialog.getByLabel("Current password").fill(TEST_PASSWORD)
    await dialog.getByRole("button", { name: "Continue" }).click()
    await expect(dialog.getByRole("img", { name: "QR code for your authenticator app" })).toBeVisible()
    const setupKey = (await dialog.locator("code").innerText()).trim()
    await fillCode(page, totpCode(setupKey))
    await dialog.getByRole("button", { name: "Verify and turn on" }).click()

    const codesDialog = page.getByRole("dialog", { name: "Save your backup codes" })
    await expect(codesDialog.getByRole("listitem")).toHaveCount(BACKUP_CODE_COUNT)
    await codesDialog.getByRole("button", { name: "I've saved them" }).click()
    await expect(twoFactor.getByText("On", { exact: true })).toBeVisible()

    const withCode = await openDevice({ baseURL, browser }, email)
    await expect(withCode.page).toHaveURL(/\/auth\/two-factor/u)
    await new AuthPage(withCode.page).waitForAppReady()
    await fillCode(withCode.page, totpCode(setupKey))
    await withCode.page.getByTestId("two-factor-form-submit-button").click()
    await expect(withCode.page).toHaveURL(ADMIN_HOME)
    await withCode.context.close()

    await twoFactor.getByRole("button", { name: "Turn off" }).click()
    const disable = page.getByRole("dialog", { name: "Turn off two-factor authentication" })
    await disable.getByLabel("Current password").fill(TEST_PASSWORD)
    await disable.getByRole("button", { name: "Turn off" }).click()
    await expect(page.getByText("Two-factor authentication is off.")).toBeVisible()
    await expect(twoFactor.getByText("Off", { exact: true })).toBeVisible()

    const withoutCode = await openDevice({ baseURL, browser }, email)
    await expect(withoutCode.page).toHaveURL(ADMIN_HOME)
    await withoutCode.context.close()
  })

  test("an admin signs out one other device, then every other device, and stays signed in here", async ({
    authPage,
    baseURL,
    browser,
    page,
    request,
  }) => {
    const email = await signInAsNewAdmin({ authPage, baseURL, browser, page, request })
    const firefox = await openDevice({ baseURL, browser }, email, FIREFOX_ON_WINDOWS)
    const iphone = await openDevice({ baseURL, browser }, email, SAFARI_ON_IPHONE)
    await expect(firefox.page).toHaveURL(ADMIN_HOME)
    await expect(iphone.page).toHaveURL(ADMIN_HOME)

    await openSecuritySettings(page, authPage)
    const sessions = card(page, "Sessions")
    await expect(sessions.getByRole("listitem")).toHaveCount(3)
    await sessions.getByRole("button", { name: "Sign out Firefox on Windows" }).click()
    await expect(page.getByText("That device is signed out.")).toBeVisible()
    await expect(sessions.getByRole("listitem")).toHaveCount(2)
    await expectSignedOut(firefox.page)
    await iphone.page.reload({ waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await expect(iphone.page).toHaveURL(ADMIN_HOME)

    await sessions.getByRole("button", { name: "Sign out other devices" }).click()
    await expect(page.getByText("Every other device is signed out.")).toBeVisible()
    await expect(sessions.getByText("No other device is signed in.")).toBeVisible()
    await expectSignedOut(iphone.page)
    await page.reload({ waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await expect(page).toHaveURL(/\/admin\/settings/u)
    await firefox.context.close()
    await iphone.context.close()
  })
})
