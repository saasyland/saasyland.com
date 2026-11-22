import type { APIRequestContext, Browser, BrowserContext, Locator, Page } from "@playwright/test"

import authErrors from "../../messages/en-US/auth.errors.json" with { type: "json" }
import { TEST_PASSWORD } from "../data/accounts"
import { COLOR_SCHEMES, accessibilityViolations } from "../fixtures/accessibility"
import { expect, test } from "../fixtures/auth"
import {
  expectChangeEmailConfirmation,
  expectDeleteAccountEmail,
  expectPasswordChangedEmail,
  expectVerificationEmail,
} from "../fixtures/emails"
import { approveGitHub } from "../fixtures/github"
import { totpCode } from "../fixtures/totp"
import { AuthPage } from "../pages"
import { APP_NAVIGATION_WAIT_UNTIL, RENDERED_LOCATION_KEY, recordRenderedLocations } from "../pages/base-page"

const DISCONNECT_SETTLE_MS = 3000
const NEW_PASSWORD = "SecuritySettings456!"
const COUNTRY = "PL"
const FIREFOX_ON_WINDOWS = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0"
const SAFARI_ON_IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1"

const uniqueEmail = (label: string): string => `${label}.${crypto.randomUUID()}@example.test`

const clientHeaders = (): Record<string, string> => ({
  "CF-Connecting-IP": `2001:db8:${crypto.randomUUID().slice(0, 4)}::`,
  "CF-IPCountry": COUNTRY,
})

const card = (page: Page, title: string): Locator =>
  page.locator("[data-slot=card]").filter({ has: page.getByRole("heading", { exact: true, level: 2, name: title }) })

const createAccount = async ({ authPage, page, request }: { authPage: AuthPage; page: Page; request: APIRequestContext }, label: string): Promise<string> => {
  const email = uniqueEmail(label)
  await page.setExtraHTTPHeaders(clientHeaders())
  await authPage.signUp(email, TEST_PASSWORD)
  await expect(page).toHaveURL(/\/app\/?$/u)
  await page.goto((await expectVerificationEmail(request, email)).toString(), { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await expect(page).toHaveURL(/\/app\/?$/u)
  await authPage.waitForAppReady()
  return email
}

const openSettings = async (page: Page, authPage: AuthPage, tab: "general" | "security"): Promise<void> => {
  await page.goto(`/app/settings?tab=${tab}`, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await authPage.waitForAppReady()
  await authPage.waitForHydration(page.getByRole("tabpanel"))
}

const signInWith = async (page: Page, { email, password }: { email: string; password: string }): Promise<void> => {
  const authPage = new AuthPage(page)
  await authPage.gotoSignIn()
  await authPage.emailField().fill(email)
  await authPage.passwordField().fill(password)
  await authPage.signInSubmitButton().click()
}

const openDevice = async (
  { baseURL, browser }: { baseURL: string | undefined; browser: Browser },
  { email, password = TEST_PASSWORD, userAgent }: { email: string; password?: string; userAgent?: string },
): Promise<{ context: BrowserContext; page: Page }> => {
  const context = await browser.newContext({ ...(baseURL === undefined ? {} : { baseURL }), ...(userAgent === undefined ? {} : { userAgent }) })
  await context.addInitScript(recordRenderedLocations, RENDERED_LOCATION_KEY)
  const page = await context.newPage()
  await page.setExtraHTTPHeaders(clientHeaders())
  await signInWith(page, { email, password })
  return { context, page }
}

const expectSignedOut = async (page: Page): Promise<void> => {
  await page.goto("/app/settings", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await expect(page).toHaveURL(/\/auth\/sign-in/u)
}

const signOut = async (page: Page, authPage: AuthPage): Promise<void> => {
  await page.context().clearCookies()
  await authPage.gotoSignIn()
}

const openBackupCodeForm = async (device: { baseURL: string | undefined; browser: Browser }, email: string) => {
  const opened = await openDevice(device, { email })
  await expect(opened.page).toHaveURL(/\/auth\/two-factor/u)
  await new AuthPage(opened.page).waitForAppReady()
  await opened.page.getByRole("button", { name: "Use a backup code instead" }).click()
  return opened
}

const submitBackupCode = async (page: Page, code: string): Promise<void> => {
  await page.getByRole("textbox", { name: "Backup code" }).fill(code)
  await page.getByTestId("two-factor-backup-submit-button").click()
}

const fillCode = async (page: Page, code: string): Promise<void> => {
  await page.getByRole("textbox", { name: /code/iu }).first().fill(code)
}

test.describe("account security settings", () => {
  test("changes the password: every other device is signed out, only the new password signs in, and an email says so", async ({
    authPage,
    baseURL,
    browser,
    page,
    request,
  }, testInfo) => {
    const email = await createAccount({ authPage, page, request }, "password")
    const other = await openDevice({ baseURL, browser }, { email, userAgent: FIREFOX_ON_WINDOWS })
    await expect(other.page).toHaveURL(/\/app\/?$/u)

    await openSettings(page, authPage, "security")
    const sessions = card(page, "Sessions")
    await expect(sessions.getByRole("listitem")).toHaveCount(2)
    await expect(sessions.getByRole("listitem").first()).toContainText("This device")
    await expect(sessions.getByRole("listitem").first()).toContainText("Poland")
    await expect(sessions.getByText("Firefox on Windows", { exact: true })).toBeVisible()
    for (const colorScheme of COLOR_SCHEMES) {
      await page.emulateMedia({ colorScheme })
      expect(await accessibilityViolations(page)).toEqual([])
      await page.screenshot({ fullPage: true, path: testInfo.outputPath(`settings-security-${colorScheme}.png`) })
    }

    const password = card(page, "Password")
    await password.getByLabel("Current password").fill(TEST_PASSWORD)
    await password.getByLabel("New password").fill(NEW_PASSWORD)
    await password.getByRole("button", { name: "Change password" }).click()
    await expect(page.getByText("Your password was changed, and every other device was signed out.")).toBeVisible()
    await expect(sessions.getByRole("listitem")).toHaveCount(1)
    await expectPasswordChangedEmail(request, email)

    await expectSignedOut(other.page)
    await other.context.close()

    await signOut(page, authPage)
    await signInWith(page, { email, password: TEST_PASSWORD })
    await expect(page.getByText(authErrors.invalidEmailOrPassword)).toBeVisible()
    await signInWith(page, { email, password: NEW_PASSWORD })
    await expect(page).toHaveURL(/\/app\/?$/u)
  })

  test("signs out one other device, then every other device, and keeps this one signed in", async ({ authPage, baseURL, browser, page, request }) => {
    const email = await createAccount({ authPage, page, request }, "sessions")
    const firefox = await openDevice({ baseURL, browser }, { email, userAgent: FIREFOX_ON_WINDOWS })
    const iphone = await openDevice({ baseURL, browser }, { email, userAgent: SAFARI_ON_IPHONE })
    await expect(firefox.page).toHaveURL(/\/app\/?$/u)
    await expect(iphone.page).toHaveURL(/\/app\/?$/u)

    await openSettings(page, authPage, "security")
    const sessions = card(page, "Sessions")
    await expect(sessions.getByRole("listitem")).toHaveCount(3)
    await sessions.getByRole("button", { name: "Sign out Firefox on Windows" }).click()
    await expect(page.getByText("That device is signed out.")).toBeVisible()
    await expect(sessions.getByRole("listitem")).toHaveCount(2)
    await expectSignedOut(firefox.page)
    await iphone.page.reload({ waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await expect(iphone.page).toHaveURL(/\/app\/?$/u)

    await sessions.getByRole("button", { name: "Sign out other devices" }).click()
    await expect(page.getByText("Every other device is signed out.")).toBeVisible()
    await expect(sessions.getByText("No other device is signed in.")).toBeVisible()
    await expectSignedOut(iphone.page)
    await page.reload({ waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await expect(page).toHaveURL(/\/app\/settings/u)
    await firefox.context.close()
    await iphone.context.close()
  })

  test("changes the email: the old address confirms the change and the new address verifies it", async ({ authPage, page, request }) => {
    const email = await createAccount({ authPage, page, request }, "old-address")
    const newEmail = uniqueEmail("new-address")

    await openSettings(page, authPage, "general")
    const address = card(page, "Email address")
    await expect(address.getByText(email, { exact: true })).toBeVisible()
    await address.getByRole("button", { name: "Change email" }).click()
    await address.getByRole("textbox", { name: "New email address" }).fill(newEmail)
    await address.getByRole("button", { name: "Send the link there" }).click()
    await expect(page.getByText(`a link to confirm the change is on its way to ${email}`, { exact: false })).toBeVisible()

    await page.goto((await expectChangeEmailConfirmation(request, email)).toString(), { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await expect(page).toHaveURL(/\/app\/settings/u)
    await page.goto((await expectVerificationEmail(request, newEmail)).toString(), { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await expect(page).toHaveURL(/\/app\/settings/u)
    await authPage.waitForAppReady()
    await expect(card(page, "Email address").getByText(newEmail, { exact: true })).toBeVisible()
    await expect(card(page, "Email address").getByText("Verified", { exact: true })).toBeVisible()
  })

  test("turns on two-factor authentication, replaces the backup codes, signs in with a code and once with each new backup code, and turns it off", async ({
    authPage,
    baseURL,
    browser,
    page,
    request,
  }, testInfo) => {
    const email = await createAccount({ authPage, page, request }, "two-factor")
    await openSettings(page, authPage, "security")
    const twoFactor = card(page, "Two-factor authentication")
    await expect(twoFactor.getByText("Off", { exact: true })).toBeVisible()
    await twoFactor.getByRole("button", { name: "Turn on" }).click()

    const dialog = page.getByRole("dialog", { name: "Turn on two-factor authentication" })
    await dialog.getByLabel("Current password").fill(TEST_PASSWORD)
    await dialog.getByRole("button", { name: "Continue" }).click()
    await expect(dialog.getByRole("img", { name: "QR code for your authenticator app" })).toBeVisible()
    const setupKey = (await dialog.locator("code").innerText()).trim()
    await page.emulateMedia({ colorScheme: "dark" })
    await dialog.screenshot({ path: testInfo.outputPath("two-factor-setup-dark.png") })
    await fillCode(page, totpCode(setupKey))
    await dialog.getByRole("button", { name: "Verify and turn on" }).click()

    const codesDialog = page.getByRole("dialog", { name: "Save your backup codes" })
    await expect(codesDialog.getByRole("listitem")).toHaveCount(10)
    const [replacedCode = ""] = await codesDialog.getByRole("listitem").allInnerTexts()
    await expect(codesDialog.getByRole("link", { name: "Download" })).toHaveAttribute("download", /backup-codes\.txt$/u)
    await codesDialog.getByRole("button", { name: "I've saved them" }).click()
    await expect(twoFactor.getByText("On", { exact: true })).toBeVisible()

    await twoFactor.getByRole("button", { name: "New backup codes" }).click()
    const regenerate = page.getByRole("dialog", { name: "Create new backup codes" })
    await regenerate.getByLabel("Current password").fill(TEST_PASSWORD)
    await regenerate.getByRole("button", { name: "Create new codes" }).click()
    await expect(codesDialog.getByRole("listitem")).toHaveCount(10)
    const [firstCode = "", secondCode = ""] = await codesDialog.getByRole("listitem").allInnerTexts()
    expect(firstCode).not.toBe(replacedCode)
    await codesDialog.getByRole("button", { name: "I've saved them" }).click()

    const withCode = await openDevice({ baseURL, browser }, { email })
    await expect(withCode.page).toHaveURL(/\/auth\/two-factor/u)
    await new AuthPage(withCode.page).waitForAppReady()
    await fillCode(withCode.page, totpCode(setupKey))
    await withCode.page.getByTestId("two-factor-form-submit-button").click()
    await expect(withCode.page).toHaveURL(/\/app\/?$/u)
    await withCode.context.close()

    const withBackupCode = await openBackupCodeForm({ baseURL, browser }, email)
    await submitBackupCode(withBackupCode.page, replacedCode)
    await expect(withBackupCode.page.getByText(authErrors.invalidBackupCode)).toBeVisible()
    await submitBackupCode(withBackupCode.page, firstCode)
    await expect(withBackupCode.page).toHaveURL(/\/app\/?$/u)
    await withBackupCode.context.close()

    const withUsedCode = await openBackupCodeForm({ baseURL, browser }, email)
    await submitBackupCode(withUsedCode.page, firstCode)
    await expect(withUsedCode.page.getByText(authErrors.invalidBackupCode)).toBeVisible()
    await expect(withUsedCode.page).toHaveURL(/\/auth\/two-factor/u)
    await submitBackupCode(withUsedCode.page, secondCode)
    await expect(withUsedCode.page).toHaveURL(/\/app\/?$/u)
    await withUsedCode.context.close()

    await twoFactor.getByRole("button", { name: "Turn off" }).click()
    const disable = page.getByRole("dialog", { name: "Turn off two-factor authentication" })
    await disable.getByLabel("Current password").fill(TEST_PASSWORD)
    await disable.getByRole("button", { name: "Turn off" }).click()
    await expect(page.getByText("Two-factor authentication is off.")).toBeVisible()
    await expect(twoFactor.getByText("Off", { exact: true })).toBeVisible()

    const withoutCode = await openDevice({ baseURL, browser }, { email })
    await expect(withoutCode.page).toHaveURL(/\/app\/?$/u)
    await withoutCode.context.close()
  })

  test("connects and disconnects GitHub, and keeps the only way an account signs in until it sets a password", async ({
    authPage,
    page,
    request,
  }) => {
    await createAccount({ authPage, page, request }, "connected")
    await approveGitHub(page, { email: uniqueEmail("github"), id: Math.floor(Math.random() * 1e9) + 1, name: "Octo Cat" })
    await openSettings(page, authPage, "security")
    const accounts = card(page, "Connected accounts")
    const github = accounts.getByRole("listitem").filter({ hasText: "GitHub" })
    await expect(github).toContainText("Not connected")
    await github.getByRole("button", { name: "Connect GitHub" }).click()
    await expect(page).toHaveURL(/\/app\/settings\?tab=security$/u)
    await authPage.waitForAppReady()
    await authPage.waitForHydration(accounts)
    await expect(github).toContainText("Connected")
    const disconnect = github.getByRole("button", { name: "Disconnect GitHub" })
    await expect(async () => {
      if (await disconnect.isVisible()) {
        await disconnect.click()
      }
      await expect(github).toContainText("Not connected", { timeout: DISCONNECT_SETTLE_MS })
    }).toPass()
    await expect(page.getByText("GitHub is disconnected.")).toBeVisible()
    await expect(card(page, "Password").getByLabel("Current password")).toBeVisible()

    await signOut(page, authPage)
    const githubEmail = uniqueEmail("github-only")
    await approveGitHub(page, { email: githubEmail, id: Math.floor(Math.random() * 1e9) + 1, name: "Git Hub" })
    await authPage.oauthGitHubButton().click()
    await expect(page).toHaveURL(/\/app\/?$/u)
    await openSettings(page, authPage, "security")
    await expect(github.getByRole("button", { name: "Disconnect GitHub" })).toHaveCount(0)
    await expect(accounts.getByText("This is the only way you sign in.", { exact: false })).toBeVisible()
    await expect(card(page, "Two-factor authentication").getByText("Set a password first", { exact: false })).toBeVisible()

    const setPassword = card(page, "Set a password")
    await setPassword.getByLabel("New password").fill(NEW_PASSWORD)
    await setPassword.getByRole("button", { name: "Set password" }).click()
    await expect(page.getByText("Your password was set, and every other device was signed out.")).toBeVisible()
    await github.getByRole("button", { name: "Disconnect GitHub" }).click()
    await expect(github).toContainText("Not connected")

    await signOut(page, authPage)
    await signInWith(page, { email: githubEmail, password: NEW_PASSWORD })
    await expect(page).toHaveURL(/\/app\/?$/u)
  })

  test("deletes the account through the emailed link, after which its address no longer signs in", async ({ authPage, page, request }, testInfo) => {
    const email = await createAccount({ authPage, page, request }, "delete")
    await openSettings(page, authPage, "general")
    for (const colorScheme of COLOR_SCHEMES) {
      await page.emulateMedia({ colorScheme })
      expect(await accessibilityViolations(page)).toEqual([])
    }
    const deletion = card(page, "Delete account")
    await deletion.getByRole("button", { name: "Delete account" }).click()
    const dialog = page.getByRole("dialog", { name: "Delete your account?" })
    await dialog.getByLabel("Current password").fill(TEST_PASSWORD)
    await dialog.getByRole("button", { name: "Email me the link" }).click()
    await expect(deletion.getByRole("status")).toContainText(`We sent a confirmation link to ${email}.`)

    await page.goto((await expectDeleteAccountEmail(request, email)).toString(), { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await authPage.waitForAppReady()
    await authPage.waitForHydration(page.getByRole("main"))
    await expect(page.getByRole("link", { name: "Settings" }).first()).toHaveAttribute("aria-current", "page")
    await expect(page.getByRole("heading", { level: 2, name: "Delete your account for good?" })).toBeVisible()
    for (const colorScheme of COLOR_SCHEMES) {
      await page.emulateMedia({ colorScheme })
      expect(await accessibilityViolations(page)).toEqual([])
      await page.screenshot({ fullPage: true, path: testInfo.outputPath(`delete-account-${colorScheme}.png`) })
    }
    await page.getByRole("button", { name: "Delete my account" }).click()
    await expect(page.getByText("Your account was deleted.")).toBeVisible()
    await expect(page).toHaveURL(/\/$/u)

    await signInWith(page, { email, password: TEST_PASSWORD })
    await expect(page.getByText(authErrors.invalidEmailOrPassword)).toBeVisible()
  })
})
