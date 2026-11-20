import { HTTP_STATUS } from "../../src/modules/_core/constants/api"
import { SOCIAL_IMAGE } from "../../src/lib/seo"
import { APP_URL } from "../../src/presentation/branding"
import { ROUTES } from "../../src/routes"
import type { Page } from "@playwright/test"
import authErrorMessages from "../../messages/en-US/auth.errors.json" with { type: "json" }
import verifyEmailMessages from "../../messages/en-US/pages.auth.verify-email.json" with { type: "json" }
import {
  expectExistingAccountEmail,
  expectPasswordChangedEmail,
  expectResetPasswordEmail,
  expectVerificationEmail,
} from "../fixtures/emails"
import { expect, test } from "../fixtures/auth"
import { AuthPage } from "../pages"
import { RENDERED_LOCATION_KEY, recordRenderedLocations } from "../pages/base-page"

const SIGN_UP_PASSWORD = "StrongPassword123!"
const NEW_PASSWORD = "RenewedPassword456!"
const MS_PER_SECOND = 1000

const secondOf = (milliseconds: number): number => Math.floor(milliseconds / MS_PER_SECOND)

const completeSignUp = async (authPage: AuthPage, email: string): Promise<void> => {
  await authPage.gotoSignUp()
  await authPage.nameField().fill("Test User")
  await authPage.emailField().fill(email)
  await authPage.signUpPasswordField().fill(SIGN_UP_PASSWORD)
  await authPage.confirmPasswordField().fill(SIGN_UP_PASSWORD)
  await authPage.signUpSubmitButton().click()
}

test.describe("auth", () => {
  test("sign-in page renders email and password fields", async ({ authPage }) => {
    await authPage.gotoSignIn()

    await expect(authPage.signInHeading()).toBeVisible()
    await expect(authPage.emailField()).toBeVisible()
    await expect(authPage.passwordField()).toBeVisible()
    await expect(authPage.signInSubmitButton()).toBeVisible()
  })

  test("/auth/sign-in renders its heading before JavaScript runs", async ({ pageWithoutJavaScript }) => {
    await pageWithoutJavaScript.goto("/auth/sign-in")
    await expect(pageWithoutJavaScript.getByRole("heading", { level: 1 })).toBeVisible()
    await expect(pageWithoutJavaScript.getByLabel("Email", { exact: true })).toBeVisible()
  })

  for (const authPath of ["/auth/sign-in", "/auth/sign-up"]) {
    test(`Back to home from ${authPath} returns to the home page without server-function errors`, async ({ appPage, page }) => {
      const errors: string[] = []
      page.on("pageerror", (error) => errors.push(error.message))
      page.on("response", (response) => {
        if (response.url().includes("/_serverFn/") && response.status() >= 400) {
          errors.push(`${response.status()} ${new URL(response.url()).pathname}`)
        }
      })
      await page.goto(authPath, { waitUntil: "domcontentloaded" })
      await appPage.waitForAppReady()

      await page.getByRole("link", { name: "Back to home", exact: true }).click()

      await expect(page).toHaveURL(/\/$/u)
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
      await appPage.waitForAppReady()
      await expect(page.getByText("Something went wrong", { exact: true })).toHaveCount(0)
      expect(errors).toEqual([])
    })
  }

  test("sign-up page shows its own headline and updates all four password requirements", async ({ authPage, page }, testInfo) => {
    await authPage.gotoSignUp()

    await expect(authPage.signUpHeading()).toBeVisible()
    await expect(authPage.emailField()).toBeVisible()
    await expect(page.getByText("Start building the part only you can build.", { exact: true })).toBeVisible()

    const requirements = page.getByRole("list", { name: "Password requirements", exact: true })
    const met = requirements.getByText("Requirement met", { exact: true })
    const notMet = requirements.getByText("Requirement not met", { exact: true })
    const passwordMatch = requirements.getByRole("listitem").filter({ hasText: "Passwords match" })
    await expect(requirements.getByRole("listitem")).toHaveCount(4)
    await expect(passwordMatch.getByText("Passwords match", { exact: true })).toBeVisible()
    await expect(requirements.getByText("Not met yet", { exact: true })).toHaveCount(0)
    await expect(notMet).toHaveCount(4)
    for (const status of await notMet.all()) {
      await expect(status).toHaveClass("sr-only")
      await expect(status).toHaveCSS("clip-path", "inset(50%)")
    }
    await expect(met).toHaveCount(0)
    await page.screenshot({ fullPage: true, path: testInfo.outputPath("signup-password-requirements-empty.png") })

    await authPage.signUpPasswordField().fill(SIGN_UP_PASSWORD)
    await expect(met).toHaveCount(3)
    await expect(met.first()).toHaveClass("sr-only")
    await expect(met.first()).toHaveCSS("clip-path", "inset(50%)")
    await expect(notMet).toHaveCount(1)
    await expect(passwordMatch).toContainText("Requirement not met")
    await page.screenshot({ fullPage: true, path: testInfo.outputPath("signup-password-requirements-mixed.png") })

    await authPage.confirmPasswordField().fill("DifferentPassword123!")
    await expect(met).toHaveCount(3)
    await expect(passwordMatch).toContainText("Requirement not met")

    await authPage.confirmPasswordField().fill(SIGN_UP_PASSWORD)
    await expect(met).toHaveCount(4)
    await expect(notMet).toHaveCount(0)

    await authPage.signUpPasswordField().fill("ChangedPassword123!")
    await expect(met).toHaveCount(3)
    await expect(passwordMatch).toContainText("Requirement not met")
    await expect(passwordMatch.getByText("Passwords match", { exact: true })).toBeVisible()
  })

  test("prefixed locale sign-up route is reachable", async ({ authPage, page }) => {
    await authPage.gotoSignUp("/en")

    await expect(page).toHaveURL(/\/auth\/sign-up/u)
    await expect(authPage.emailField()).toBeVisible()
  })

  test("signup sends a verification email whose link signs the new account into the app", async ({ authPage, page, request }) => {
    const id = crypto.randomUUID()
    const email = `signup.${id}@example.test`
    await page.setExtraHTTPHeaders({ "CF-Connecting-IP": `2001:db8:${id.slice(0, 4)}::` })
    await completeSignUp(authPage, email)

    await expect(page).toHaveURL(new RegExp(`\/auth\/verify-email\\?email=${encodeURIComponent(email)}`, "u"))
    await expect(authPage.verifyEmailResendButton()).toBeVisible()
    await expect(authPage.emailField()).toHaveCount(0)
    const verificationUrl = await expectVerificationEmail(request, email)
    expect(verificationUrl.origin).toBe(new URL(page.url()).origin)

    await page.getByRole("link", { name: "Back to sign in", exact: true }).click()
    await expect(page).toHaveURL(/\/auth\/sign-in$/u)
    await expect(authPage.signInSubmitButton()).toBeVisible()

    await page.goto(verificationUrl.toString())
    await expect(page).toHaveURL(/\/app\/?$/u)
    const session = await page.request.get("/api/auth/get-session")
    expect(await session.json()).toMatchObject({ user: { email, emailVerified: true } })

    await authPage.waitForAppReady()
    await page.getByRole("button", { exact: true, name: "Sign out" }).click()
    await expect(page).toHaveURL(/\/auth\/sign-in$/u)
    await expect(authPage.signInSubmitButton()).toBeVisible()
    await page.goto(verificationUrl.toString())
    await expect(page).toHaveURL(/\/auth\/sign-in$/u)
    const replaySession = await page.request.get("/api/auth/get-session")
    expect(await replaySession.json()).toBeNull()
  })

  test("repeating signup for an unverified email sends another verification email and resend still works", async ({ authPage, page, request }) => {
    const id = crypto.randomUUID()
    const email = `repeat-signup.${id}@example.test`
    await page.setExtraHTTPHeaders({ "CF-Connecting-IP": `2001:db8:${id.slice(0, 4)}::` })
    await completeSignUp(authPage, email)
    await expect(page).toHaveURL(/\/auth\/verify-email\?email=/u)
    await expectVerificationEmail(request, email)
    const firstEmailDeliveredBy = Date.now()

    await completeSignUp(authPage, email)
    await expect(page).toHaveURL(/\/auth\/verify-email\?email=/u)
    await expectVerificationEmail(request, email, 2)

    await expect
      .poll(() => secondOf(Date.now()), {
        message: "A resend in the first email's second signs the same token, and Resend delivers a repeated idempotency key once",
      })
      .toBeGreaterThan(secondOf(firstEmailDeliveredBy))
    await authPage.verifyEmailResendButton().click()
    const verificationUrl = await expectVerificationEmail(request, email, 3)
    expect(verificationUrl.origin).toBe(new URL(page.url()).origin)
    await page.goto(verificationUrl.toString())
    await expect(page).toHaveURL(/\/app\/?$/u)
  })

  test("sign-up shows one screen for a new, an existing verified and an existing unverified email, and the existing account resets its password and signs in", async ({
    authPage,
    baseURL,
    browser,
    page,
    request,
  }) => {
    const id = crypto.randomUUID()
    const existing = `existing.${id}@example.test`
    const pending = `pending.${id}@example.test`
    const fromNewAddress = (target: Page): Promise<void> =>
      target.setExtraHTTPHeaders({ "CF-Connecting-IP": `2001:db8:${crypto.randomUUID().slice(0, 4)}::` })
    const sessionOf = async (target: Page): Promise<unknown> => (await target.request.get("/api/auth/get-session")).json()

    await fromNewAddress(page)
    await completeSignUp(authPage, existing)
    await expect(page).toHaveURL(/\/auth\/verify-email\?email=/u)
    await expect(page.getByText(verifyEmailMessages.form.pendingDescription, { exact: true })).toBeVisible()
    await page.goto((await expectVerificationEmail(request, existing)).toString())
    await expect(page).toHaveURL(/\/app\/?$/u)
    expect(await sessionOf(page)).toMatchObject({ user: { email: existing } })

    const visitorContext = await browser.newContext(baseURL === undefined ? {} : { baseURL })
    await visitorContext.addInitScript(recordRenderedLocations, RENDERED_LOCATION_KEY)
    const visitorPage = await visitorContext.newPage()
    const visitor = new AuthPage(visitorPage)
    const nextScreen = visitorPage.getByText(verifyEmailMessages.form.pendingDescription, { exact: true })

    await fromNewAddress(visitorPage)
    await completeSignUp(visitor, existing)
    await expect(visitorPage).toHaveURL(/\/auth\/verify-email\?email=/u)
    await expect(nextScreen).toBeVisible()
    const { resetPasswordUrl, signInUrl } = await expectExistingAccountEmail(request, existing)
    expect(signInUrl.origin).toBe(new URL(visitorPage.url()).origin)

    await fromNewAddress(visitorPage)
    await completeSignUp(visitor, pending)
    await expect(nextScreen).toBeVisible()
    await expectVerificationEmail(request, pending)
    await fromNewAddress(visitorPage)
    await completeSignUp(visitor, pending)
    await expect(visitorPage).toHaveURL(/\/auth\/verify-email\?email=/u)
    await expect(nextScreen).toBeVisible()
    await expectVerificationEmail(request, pending, 2)

    await fromNewAddress(visitorPage)
    await visitor.gotoSignIn()
    await visitor.emailField().fill(pending)
    await visitor.passwordField().fill(SIGN_UP_PASSWORD)
    await visitor.signInSubmitButton().click()
    await expect(visitorPage).toHaveURL(/\/auth\/verify-email\?.*unverified=true/u)
    await expect(visitorPage.getByText(verifyEmailMessages.form.unverifiedDescription, { exact: true })).toBeVisible()
    await expect(visitor.verifyEmailResendButton()).toBeVisible()
    await expectVerificationEmail(request, pending, 3)

    await fromNewAddress(visitorPage)
    await visitorPage.goto(resetPasswordUrl.toString())
    await expect(visitor.forgotPasswordHeading()).toBeVisible()
    await visitor.waitForAppReady()
    await visitor.emailField().fill(existing)
    await visitorPage.getByRole("button", { exact: true, name: "Send reset link" }).click()
    await visitorPage.goto((await expectResetPasswordEmail(request, existing)).toString())
    await expect(visitorPage).toHaveURL(/\/auth\/reset-password\?token=/u)
    await visitor.waitForAppReady()
    await visitorPage.getByLabel("New password", { exact: true }).fill(NEW_PASSWORD)
    await visitorPage.getByLabel("Confirm new password", { exact: true }).fill(NEW_PASSWORD)
    await visitor.resetPasswordSubmitButton().click()
    await expect(visitorPage).toHaveURL(/\/auth\/sign-in$/u)
    await expectPasswordChangedEmail(request, existing)
    expect(await sessionOf(page)).toBeNull()

    await fromNewAddress(visitorPage)
    await visitor.emailField().fill(existing)
    await visitor.passwordField().fill(SIGN_UP_PASSWORD)
    await visitor.signInSubmitButton().click()
    await expect(visitorPage.getByText(authErrorMessages.invalidEmailOrPassword, { exact: true })).toBeVisible()
    await expect(visitorPage).toHaveURL(/\/auth\/sign-in$/u)
    expect(await sessionOf(visitorPage)).toBeNull()

    await visitorPage.goto(signInUrl.toString())
    await visitor.waitForAppReady()
    await visitor.emailField().fill(existing)
    await visitor.passwordField().fill(NEW_PASSWORD)
    await visitor.signInSubmitButton().click()
    await expect(visitorPage).toHaveURL(/\/app\/?$/u)
    expect(await sessionOf(visitorPage)).toMatchObject({ user: { email: existing, emailVerified: true } })
    await visitorContext.close()
  })

  test("forgot-password page renders email field", async ({ authPage }) => {
    await authPage.gotoForgotPassword()

    await expect(authPage.forgotPasswordHeading()).toBeVisible()
    await expect(authPage.emailField()).toBeVisible()
  })

  test("sign-in page exposes GitHub OAuth button", async ({ authPage }) => {
    await authPage.gotoSignIn()

    await expect(authPage.oauthGitHubButton()).toBeVisible()
  })

  test("reset-password page without token shows invalid link state", async ({ authPage }) => {
    await authPage.gotoResetPassword()

    await expect(authPage.requestNewResetLink()).toBeVisible()
  })

  test("reset-password page with token renders the reset form", async ({ authPage }) => {
    await authPage.gotoResetPassword("", "?token=test-token")

    await expect(authPage.resetPasswordHeading()).toBeVisible()
    await expect(authPage.resetPasswordSubmitButton()).toBeVisible()
  })

  test("sign-in page links to sign-up", async ({ authPage, page }) => {
    await authPage.gotoSignIn()

    await page.getByRole("link", { name: /sign up/iu }).click()

    await expect(page).toHaveURL(/\/auth\/sign-up/u)
  })

  test("verify-email page renders pending state", async ({ authPage }) => {
    await authPage.gotoVerifyEmail()

    await expect(authPage.signInHeading()).toBeVisible()
    await expect(authPage.verifyEmailResendButton()).toBeVisible()
  })

  test("verify-email page with an invalid token offers sign-in and resend recovery", async ({ authPage, page }) => {
    await authPage.gotoVerifyEmail("", "?token=test-token")

    await expect(page.getByText("This verification link is invalid or has expired.", { exact: true })).toBeVisible()
    await expect(page.getByRole("link", { name: "Back to sign in", exact: true })).toBeVisible()
    await expect(authPage.emailField()).toBeVisible()
    await expect(authPage.verifyEmailResendButton()).toBeVisible()
  })

  test("verification redirects a new account to its localized app", async ({ authPage, page, request }) => {
    const id = crypto.randomUUID()
    const email = `localized.${id}@example.test`
    await page.setExtraHTTPHeaders({ "CF-Connecting-IP": `2001:db8:${id.slice(0, 4)}::` })
    await completeSignUp(authPage, email)
    await expect(page).toHaveURL(/\/auth\/verify-email\?email=/u)
    const verificationUrl = await expectVerificationEmail(request, email)
    verificationUrl.pathname = "/pl-PL/auth/verify-email"

    await page.goto(verificationUrl.toString())

    await expect(page).toHaveURL(/\/pl-PL\/app\/?$/u)
    const session = await page.request.get("/api/auth/get-session")
    expect(await session.json()).toMatchObject({ user: { email, emailVerified: true } })
  })

  test("localized verification errors preserve the locale and ignore an untrusted callback URL", async ({ authPage, page }) => {
    await authPage.gotoVerifyEmail("/pl-PL", "?token=invalid-token&verified=true&callbackURL=https%3A%2F%2Fexample.org")

    await expect(page).toHaveURL(
      (url) =>
        url.pathname === "/pl-PL/auth/verify-email" &&
        url.searchParams.get("error") === "INVALID_TOKEN" &&
        !url.searchParams.has("callbackURL"),
    )
    await expect(page.getByText("Ten link weryfikacyjny jest nieprawidłowy lub wygasł.", { exact: true })).toBeVisible()
    await expect(page.getByRole("link", { name: "Wróć do logowania", exact: true })).toHaveAttribute("href", "/pl-PL/auth/sign-in")
    await expect(authPage.verifyEmailResendButton()).toBeVisible()
    const session = await page.request.get("/api/auth/get-session")
    expect(await session.json()).toBeNull()
  })

  test("a verification success marker cannot authenticate a signed-out visitor", async ({ page }) => {
    await page.goto("/pl-PL/auth/verify-email?verified=true&callbackURL=https%3A%2F%2Fexample.org")

    await expect(page).toHaveURL(/\/pl-PL\/auth\/sign-in$/u)
    const session = await page.request.get("/api/auth/get-session")
    expect(await session.json()).toBeNull()
  })

  test("two-factor page renders authentication form", async ({ authPage }) => {
    await authPage.gotoTwoFactor()

    await expect(authPage.signInHeading()).toBeVisible()
    await expect(authPage.twoFactorSubmitButton()).toBeVisible()
  })
})

test("the sign-in page, which is not prerendered, shares the site card", async ({ page, request }) => {
  await page.goto(ROUTES.SIGN_IN)
  await expect(page.locator('head > meta[property="og:image"]')).toHaveAttribute("content", `${APP_URL}${SOCIAL_IMAGE.SITE_PATH}`)
  expect((await request.get(SOCIAL_IMAGE.SITE_PATH)).status()).toBe(HTTP_STATUS.OK)
})
