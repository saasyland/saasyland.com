import type { Page } from "@playwright/test"
import * as zod from "zod"

import errors from "../../messages/en-US/errors.json" with { type: "json" }
import resendMessages from "../../messages/en-US/components.custom.email-link-resend.json" with { type: "json" }
import newsletterMessages from "../../messages/en-US/components.custom.newsletter-form.json" with { type: "json" }
import { HTTP_STATUS } from "../../src/modules/_core/constants/api"
import { ERROR_CODES } from "../../src/modules/_core/constants/errors"
import { NEWSLETTER_EMAIL_PURPOSE } from "../../src/modules/newsletter-subscriber/newsletter-subscriber.constants"
import { RECIPIENT_EMAILS_PER_HOUR } from "../../src/modules/rate-limit/rate-limit.constants"
import { VERIFICATION_EMAIL_PURPOSE } from "../../src/modules/verification/verification.constants"
import * as ROUTES from "../../src/routes"
import { TEST_ACCOUNTS, TEST_PASSWORD } from "../data/accounts"
import { expect, test } from "../fixtures/auth"
import { getSentEmails } from "../fixtures/emails"
import { builtServerFunction, callServerFunction } from "../fixtures/server-functions"
import { ownAddress } from "../fixtures/address"
import { signUpAndVerify } from "../fixtures/sign-up"
import type { AuthPage, BasePage } from "../pages"
import { APP_NAVIGATION_WAIT_UNTIL } from "../pages/base-page"

const [, customer] = TEST_ACCOUNTS
const OTHER_ORIGIN = "https://attacker.example"
const SENSITIVE_FUNCTIONS = ["signUpWithPassword", "requestPasswordReset", "sendVerificationEmail", "verifyTotp"] as const
const ATTEMPTS_PAST_THE_LIMIT = 10

const sessionSchema = zod.object({ user: zod.object({ email: zod.string() }) }).nullable()

const emailsOf = async (page: Page, recipient: string, purpose: string): Promise<number> =>
  (await getSentEmails(page.request, recipient)).filter(({ idempotencyKey }) => idempotencyKey.startsWith(`${purpose}/`)).length

const askForResetLink = async (authPage: AuthPage, page: Page, email: string, address: string): Promise<void> => {
  await page.setExtraHTTPHeaders({ "CF-Connecting-IP": address })
  await authPage.gotoForgotPassword()
  await authPage.emailField().fill(email)
  await page.getByRole("button", { exact: true, name: "Send reset link" }).click()
}

const subscribe = async (appPage: BasePage, page: Page, email: string): Promise<void> => {
  await page.setExtraHTTPHeaders({ "CF-Connecting-IP": ownAddress() })
  await page.goto(ROUTES.BLOG, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
  const footer = page.getByRole("contentinfo")
  await footer.getByRole("textbox", { exact: true, name: newsletterMessages.label }).fill(email)
  await footer.getByRole("button", { exact: true, name: newsletterMessages.button }).click()
  await expect(page.getByText(newsletterMessages.confirmationSent)).toBeVisible()
}

test.describe("auth limits", () => {
  test("a sign-up, reset request, verification email or two-factor code over the limit for one address is refused", async ({
    authPage,
    baseURL,
    page,
  }) => {
    const origin = new URL(baseURL ?? "").origin
    const exhausted = ownAddress()
    for (const name of SENSITIVE_FUNCTIONS) {
      const serverFunction = await builtServerFunction(name)
      const answers: string[] = []
      for (let attempt = 0; attempt < ATTEMPTS_PAST_THE_LIMIT; attempt += 1) {
        answers.push(await callServerFunction(page.request, serverFunction, { address: exhausted, origin }))
      }
      expect(answers.at(0), name).not.toContain(ERROR_CODES.TOO_MANY_REQUESTS)
      expect(answers.at(-1), name).toContain(ERROR_CODES.TOO_MANY_REQUESTS)
      expect(await callServerFunction(page.request, serverFunction, { origin }), name).not.toContain(ERROR_CODES.TOO_MANY_REQUESTS)
    }

    await askForResetLink(authPage, page, `reset-limit.${crypto.randomUUID()}@example.test`, exhausted)
    await expect(page.getByText(errors.codes.TOO_MANY_REQUESTS)).toBeVisible()
    const email = `reset-limit.${crypto.randomUUID()}@example.test`
    await askForResetLink(authPage, page, email, ownAddress())
    await expect(page.getByText(`If an account exists for ${email}`, { exact: false })).toBeVisible()
  })

  test("a reset or newsletter email over the hourly limit for one recipient is skipped without an error", async ({
    appPage,
    authPage,
    context,
    page,
    request,
  }) => {
    test.slow()
    const { email } = await signUpAndVerify({ authPage, page, request })
    await context.clearCookies()
    for (let attempt = 0; attempt < RECIPIENT_EMAILS_PER_HOUR; attempt += 1) {
      await askForResetLink(authPage, page, email, ownAddress())
      await expect(page.getByText(`If an account exists for ${email}`, { exact: false })).toBeVisible()
    }
    await expect.poll(async () => emailsOf(page, email, VERIFICATION_EMAIL_PURPOSE.RESET_PASSWORD)).toBe(RECIPIENT_EMAILS_PER_HOUR)

    await askForResetLink(authPage, page, email, ownAddress())
    await expect(page.getByRole("status").getByText(resendMessages.limit.split("{")[0] ?? "", { exact: false })).toBeVisible()
    await expect(page.getByText(errors.codes.TOO_MANY_REQUESTS)).toHaveCount(0)
    expect(await emailsOf(page, email, VERIFICATION_EMAIL_PURPOSE.RESET_PASSWORD)).toBe(RECIPIENT_EMAILS_PER_HOUR)

    const reader = `newsletter-limit.${crypto.randomUUID()}@example.test`
    for (let attempt = 0; attempt <= RECIPIENT_EMAILS_PER_HOUR; attempt += 1) {
      await subscribe(appPage, page, reader)
    }
    await expect.poll(async () => emailsOf(page, reader, NEWSLETTER_EMAIL_PURPOSE.NEWSLETTER_CONFIRMATION)).toBe(RECIPIENT_EMAILS_PER_HOUR)
  })

  test("a sign-in or a sign-out from another origin is refused", async ({ authPage, baseURL, page }) => {
    const signIn = `${ROUTES.API_AUTH_BASE}${ROUTES.API_AUTH.SIGN_IN_EMAIL}`
    const credentials = { email: customer.email, password: TEST_PASSWORD }
    const refused = await page.request.post(signIn, { data: credentials, headers: { "CF-Connecting-IP": ownAddress(), Origin: OTHER_ORIGIN } })
    expect(refused.status()).toBe(HTTP_STATUS.FORBIDDEN)
    expect(sessionSchema.parse(await (await page.request.get(`${ROUTES.API_AUTH_BASE}${ROUTES.API_AUTH.GET_SESSION}`)).json())).toBeNull()

    await authPage.signIn(customer.email)
    await expect(page).toHaveURL(ROUTES.APP)
    const signOut = await page.request.post(`${ROUTES.API_AUTH_BASE}${ROUTES.API_AUTH.SIGN_OUT}`, { headers: { Origin: OTHER_ORIGIN } })
    expect(signOut.status()).toBe(HTTP_STATUS.FORBIDDEN)
    const session = sessionSchema.parse(await (await page.request.get(`${ROUTES.API_AUTH_BASE}${ROUTES.API_AUTH.GET_SESSION}`)).json())
    expect(session?.user.email).toBe(customer.email)

    const accepted = await page.request.post(`${ROUTES.API_AUTH_BASE}${ROUTES.API_AUTH.SIGN_OUT}`, { headers: { Origin: new URL(baseURL ?? "").origin } })
    expect(accepted.ok()).toBe(true)
    expect(sessionSchema.parse(await (await page.request.get(`${ROUTES.API_AUTH_BASE}${ROUTES.API_AUTH.GET_SESSION}`)).json())).toBeNull()
  })
})
