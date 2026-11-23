import type { APIRequestContext, Page } from "@playwright/test"

import { LAST_LOGIN_METHOD_COOKIE, LOGIN_METHOD } from "../../src/integrations/better-auth/auth.constants"
import { ROLE_CODES } from "../../src/integrations/better-auth/auth.roles"
import { RECIPIENT_EMAILS_PER_HOUR } from "../../src/modules/rate-limit/rate-limit.constants"
import { RESEND_COOLDOWN_SECONDS } from "../../src/modules/verification/verification.constants"
import { APP_SLUG } from "../../src/presentation/branding"
import * as ROUTES from "../../src/routes"
import { TEST_ACCOUNTS } from "../data/accounts"
import { expect, test } from "../fixtures/auth"
import { expectResetPasswordEmail, expectVerificationEmail } from "../fixtures/emails"
import { APP_NAVIGATION_WAIT_UNTIL } from "../pages/base-page"

import navigationMessages from "../../messages/en-US/components.custom.navigation.json" with { type: "json" }
import navigationAuthMessages from "../../messages/en-US/navigation.auth.json" with { type: "json" }
import polishNavigationMessages from "../../messages/pl-PL/components.custom.navigation.json" with { type: "json" }
import polishNavigationAuthMessages from "../../messages/pl-PL/navigation.auth.json" with { type: "json" }

const [, customer] = TEST_ACCOUNTS
const PASSWORD = "StrongPassword123!"
const NEW_PASSWORD = "AnotherPassword456!"
const POLISH_PREFIX = "/pl-PL"
const DESKTOP_VIEWPORT = { height: 800, width: 1280 }
const PHONE_VIEWPORT = { height: 844, width: 390 }
const MS_PER_SECOND = 1000
const PAST_THE_COOLDOWN_MS = (RESEND_COOLDOWN_SECONDS + 1) * MS_PER_SECOND

const newAddress = async (page: Page): Promise<string> => {
  const id = crypto.randomUUID()
  await page.setExtraHTTPHeaders({ "CF-Connecting-IP": `2001:db8:${id.slice(0, 4)}::` })
  return `journey.${id}@example.test`
}

const nextSecond = async (): Promise<void> => {
  const second = Math.floor(Date.now() / MS_PER_SECOND)
  await expect.poll(() => Math.floor(Date.now() / MS_PER_SECOND), { message: "Two links signed in one second share a token" }).toBeGreaterThan(second)
}

const signUpAndConfirm = async ({ page, request, signUp }: { page: Page; request: APIRequestContext; signUp: () => Promise<void> }, email: string) => {
  await signUp()
  await expect(page).toHaveURL(/\/app\/?$/u)
  await page.goto((await expectVerificationEmail(request, email)).toString(), { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await expect(page).toHaveURL(/\/app\/?$/u)
}

test.describe("the verify page", () => {
  test("resends to the account's address after a countdown, and says so honestly when the hourly limit stops a send", async ({
    authPage,
    page,
    request,
  }) => {
    const email = await newAddress(page)
    await page.clock.install()
    await authPage.signUp(email, PASSWORD)
    await expect(page).toHaveURL(/\/app\/?$/u)
    await expectVerificationEmail(request, email)

    await page.goto(ROUTES.VERIFY_EMAIL, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await authPage.waitForAppReady()
    await expect(page.getByRole("heading", { level: 1, name: "Check your inbox" })).toBeVisible()
    await expect(page.getByText(email, { exact: true })).toBeVisible()
    await expect(page.getByText("Start building the part only you can build.", { exact: true })).toBeAttached()
    const resend = authPage.verifyEmailResendButton()
    const status = page.getByRole("status")

    for (let sent = 2; sent <= RECIPIENT_EMAILS_PER_HOUR; sent++) {
      await nextSecond()
      await resend.click()
      await expect(status).toHaveText(`We sent a new link to ${email}.`)
      await expect(resend).toBeDisabled()
      await expect(resend).toContainText(`${String(RESEND_COOLDOWN_SECONDS / 60)}:00`)
      await expectVerificationEmail(request, email, sent)
      await page.clock.fastForward(PAST_THE_COOLDOWN_MS)
      await expect(resend).toBeEnabled()
    }

    await resend.click()

    await expect(status).toContainText(`We've sent ${String(RECIPIENT_EMAILS_PER_HOUR)} links to this address in the last hour, so we won't send another yet.`)
    await expect(resend).toBeDisabled()
    await expectVerificationEmail(request, email, RECIPIENT_EMAILS_PER_HOUR)
  })

  test("continues by itself once the link is opened in another tab", async ({ authPage, context, page, request }) => {
    const email = await newAddress(page)
    await authPage.signUp(email, PASSWORD, `${ROUTES.SIGN_UP}?redirect=${encodeURIComponent(ROUTES.APP_LICENSE)}`)
    await expect(page).toHaveURL(ROUTES.APP_LICENSE)
    await page.goto(`${ROUTES.VERIFY_EMAIL}?redirect=${encodeURIComponent(ROUTES.APP_LICENSE)}`, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await authPage.waitForAppReady()
    await expect(page.getByRole("heading", { level: 1, name: "Check your inbox" })).toBeVisible()

    const inbox = await context.newPage()
    await inbox.goto((await expectVerificationEmail(request, email)).toString(), { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await expect(inbox).toHaveURL(ROUTES.APP_LICENSE)

    await expect(page).toHaveURL(ROUTES.APP_LICENSE, { timeout: 15_000 })
  })

  test("names the address of a link that no longer works and leads with a new one, and says when the address is already confirmed", async ({
    authPage,
    context,
    page,
    request,
  }) => {
    const email = await newAddress(page)
    await authPage.signUp(email, PASSWORD)
    await expect(page).toHaveURL(/\/app\/?$/u)
    const link = await expectVerificationEmail(request, email)
    await context.clearCookies()
    const unsigned = `e30.${Buffer.from(JSON.stringify({ email, exp: 1 })).toString("base64url")}.signature`

    await page.goto(`${ROUTES.VERIFY_EMAIL}?token=${unsigned}`, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await authPage.waitForAppReady()
    await expect(page.getByRole("heading", { level: 1, name: "This link no longer works" })).toBeVisible()
    await expect(page.getByText(email, { exact: true })).toBeVisible()
    await nextSecond()
    await page.getByRole("button", { name: /^Send a new link/u }).click()
    await expect(page.getByRole("status")).toHaveText(`If ${email} belongs to an account, a new link is on its way.`)
    await expectVerificationEmail(request, email, 2)

    await page.goto(link.toString(), { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await expect(page).toHaveURL(/\/app\/?$/u)
    await context.clearCookies()
    await page.goto(link.toString(), { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await authPage.waitForAppReady()
    await expect(page.getByRole("heading", { level: 1, name: "Your email is confirmed" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Sign in to continue" })).toHaveAttribute(
      "href",
      `${ROUTES.SIGN_IN}?email=${encodeURIComponent(email)}`,
    )
  })
})

test.describe("signing in again", () => {
  test("keeps a wrong password on the page, and a reset keeps the address and the return path all the way back", async ({
    authPage,
    context,
    page,
    request,
  }) => {
    const email = await newAddress(page)
    await signUpAndConfirm({ page, request, signUp: () => authPage.signUp(email, PASSWORD) }, email)
    await context.clearCookies()
    await page.clock.install()

    await page.goto(`${ROUTES.SIGN_IN}?redirect=${encodeURIComponent(ROUTES.APP_SETTINGS)}`, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await authPage.waitForAppReady()
    await authPage.emailField().fill(email)
    await authPage.passwordField().fill("WrongPassword123!")
    await authPage.signInSubmitButton().click()
    const alert = page.getByRole("alert")
    await expect(alert).toContainText("Incorrect email or password.")
    await page.clock.fastForward("00:10")
    await expect(alert).toBeVisible()
    await expect(alert.getByRole("button", { name: "Continue with GitHub" })).toBeVisible()
    await expect(alert.getByRole("button", { name: "Continue with Google" })).toBeVisible()

    await alert.getByRole("link", { name: "Reset your password" }).click()
    await expect(page).toHaveURL(
      `${ROUTES.FORGOT_PASSWORD}?email=${encodeURIComponent(email)}&redirect=${encodeURIComponent(ROUTES.APP_SETTINGS)}`,
    )
    await authPage.waitForAppReady()
    await expect(authPage.emailField()).toHaveValue(email)
    await page.getByTestId("forgot-password-form-submit-button").click()
    await expect(page.getByText(`If an account exists for ${email}`, { exact: false })).toBeVisible()
    await expect(authPage.verifyEmailResendButton()).toBeDisabled()

    await page.goto((await expectResetPasswordEmail(request, email)).toString(), { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await expect(page).toHaveURL((url) => url.pathname === ROUTES.RESET_PASSWORD && url.searchParams.get("redirect") === ROUTES.APP_SETTINGS)
    await authPage.waitForAppReady()
    await page.locator("#reset-password-password").fill(NEW_PASSWORD)
    await authPage.resetPasswordSubmitButton().click()

    await expect(page).toHaveURL(`${ROUTES.SIGN_IN}?redirect=${encodeURIComponent(ROUTES.APP_SETTINGS)}`)
    await authPage.waitForAppReady()
    await authPage.emailField().fill(email)
    await authPage.passwordField().fill(NEW_PASSWORD)
    await authPage.signInSubmitButton().click()
    await expect(page).toHaveURL(ROUTES.APP_SETTINGS)
  })

  test("lists GitHub first and marks the way the visitor signed in last time", async ({ appPage, authPage, page }) => {
    await authPage.signIn(customer.email)
    await expect(page).toHaveURL("/app")
    await appPage.waitForAppReady()
    expect((await page.context().cookies()).find(({ name }) => name === LAST_LOGIN_METHOD_COOKIE)?.value).toBe(LOGIN_METHOD.EMAIL)

    await page.getByRole("button", { exact: true, name: "Sign out" }).click()
    await expect(page).toHaveURL(ROUTES.SIGN_IN)
    await authPage.waitForAppReady()

    await expect(page.getByRole("button", { name: /^Continue with/u }).first()).toHaveText("Continue with GitHub")
    await expect(page.locator("#sign-in-form").getByText("Last used", { exact: true })).toBeVisible()
  })

  test("says a session ended and names the page it returns to", async ({ appPage, authPage, baseURL, context, page }) => {
    await authPage.signIn(customer.email)
    await expect(page).toHaveURL("/app")
    await appPage.waitForAppReady()
    await context.addCookies([{ name: `${APP_SLUG}.session_token`, url: baseURL ?? "", httpOnly: true, sameSite: "Lax", value: "ended" }])

    await page.goto(ROUTES.APP_SETTINGS, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })

    await expect(page).toHaveURL((url) => url.pathname === ROUTES.SIGN_IN && url.searchParams.get("redirect") === ROUTES.APP_SETTINGS)
    await authPage.waitForAppReady()
    await expect(page.getByRole("status")).toHaveText("Your session ended. Sign in to continue to Settings.")
  })

  for (const account of TEST_ACCOUNTS) {
    test(`leads a signed-in ${account.role} from Your account in the header, the footer and the mobile menu to their workspace`, async ({
      appPage,
      authPage,
      landingPage,
      page,
    }) => {
      const workspace = account.role === ROLE_CODES.ADMIN ? ROUTES.ADMIN : ROUTES.APP
      await page.setViewportSize(DESKTOP_VIEWPORT)
      await authPage.signIn(account.email)
      await expect(page).toHaveURL(workspace)

      await landingPage.goto()
      await appPage.waitForAppReady()
      const header = page.getByRole("navigation", { name: navigationMessages.ariaLabel })
      const accountLink = header.getByRole("link", { exact: true, name: navigationAuthMessages.header.account })
      await expect(accountLink).toHaveAttribute("href", workspace)
      await expect(header.getByRole("link", { exact: true, name: navigationAuthMessages.header.signIn })).toHaveCount(0)
      const footer = page.getByRole("contentinfo")
      await expect(footer.getByRole("link", { exact: true, name: navigationAuthMessages.footer.account })).toHaveAttribute("href", workspace)
      await expect(footer.getByRole("link", { exact: true, name: navigationAuthMessages.footer.signIn })).toHaveCount(0)
      await accountLink.click()
      await expect(page).toHaveURL(workspace)
      await appPage.waitForAppReady()

      await page.setViewportSize(PHONE_VIEWPORT)
      await landingPage.goto(POLISH_PREFIX)
      await appPage.waitForAppReady()
      await page.getByRole("button", { exact: true, name: polishNavigationMessages.openMenu }).click()
      const menu = page.getByRole("dialog", { exact: true, name: polishNavigationMessages.menu })
      const polishAccount = menu.getByRole("link", { exact: true, name: polishNavigationAuthMessages.header.account })
      await expect(polishAccount).toHaveAttribute("href", `${POLISH_PREFIX}${workspace}`)
      await expect(menu.getByRole("link", { exact: true, name: polishNavigationAuthMessages.header.signIn })).toHaveCount(0)
      await polishAccount.click()
      await expect(page).toHaveURL(`${POLISH_PREFIX}${workspace}`)
    })
  }
})
