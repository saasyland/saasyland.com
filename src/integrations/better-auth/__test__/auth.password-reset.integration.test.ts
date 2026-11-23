import { getRequest } from "@tanstack/react-start/server"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { failNextResendDelivery } from "~/src/platform/testing/lib/resend"
import { TEST_APP_URL } from "~/src/platform/testing/lib/test-request"
import { flushWaitUntil } from "~/src/platform/testing/mocks/cloudflare"
import { getSentEmails } from "~/src/platform/testing/mocks/resend"

import {
  browserHeaders,
  createTestAccount,
  emailLink,
  signIn,
  signUpAndVerify,
} from "~/src/integrations/better-auth/__test__/fixtures/auth.harness"
import { auth } from "~/src/integrations/better-auth/auth.server"

import { ACCOUNT_EMAIL_PURPOSE } from "~/src/modules/account/account.constants"

import { ROUTES } from "~/src/routes"

const RESET_TOKEN = /\/reset-password\/(?<token>[^/]+)$/u
const NEW_PASSWORD = "NewSecretPass1!"

const requestPasswordReset = async (email: string): Promise<void> => {
  await auth.api.requestPasswordReset({ body: { email, redirectTo: ROUTES.RESET_PASSWORD }, headers: browserHeaders() })
  await flushWaitUntil()
}

const resetToken = (email: string): string => {
  const link = emailLink(email, `${ROUTES.API_AUTH_BASE}${ROUTES.API_AUTH.RESET_PASSWORD}/`)
  return RESET_TOKEN.exec(link.pathname)?.groups?.["token"] ?? ""
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("auth password reset", () => {
  it("emails a reset link that returns to the reset page", async () => {
    const { account } = await signUpAndVerify()

    await requestPasswordReset(account.email)

    const link = emailLink(account.email, `${ROUTES.API_AUTH_BASE}${ROUTES.API_AUTH.RESET_PASSWORD}/`)
    expect(link.searchParams.get("callbackURL")).toBe(ROUTES.RESET_PASSWORD)
  })

  it("sets the new password with the emailed token and retires the old one", async () => {
    const { account } = await signUpAndVerify()
    await requestPasswordReset(account.email)

    await auth.api.resetPassword({ body: { newPassword: NEW_PASSWORD, token: resetToken(account.email) }, headers: browserHeaders() })

    const session = await auth.api.getSession({ headers: await signIn({ email: account.email, password: NEW_PASSWORD }) })
    expect(session?.user.email).toBe(account.email)
    await expect(signIn(account)).rejects.toThrow("Invalid email or password")
  })

  it("signs out every session of the account once the password is reset", async () => {
    const { account, headers } = await signUpAndVerify()
    await requestPasswordReset(account.email)

    await auth.api.resetPassword({ body: { newPassword: NEW_PASSWORD, token: resetToken(account.email) }, headers: browserHeaders() })

    await expect(auth.api.getSession({ headers })).resolves.toBeNull()
  })

  it("rejects a password reset with an invalid token", async () => {
    await expect(
      auth.api.resetPassword({ body: { newPassword: NEW_PASSWORD, token: "invalid-token" }, headers: browserHeaders() }),
    ).rejects.toThrow("Invalid token")
  })

  it("answers a reset request for an unknown address without sending anything", async () => {
    const { email } = createTestAccount()

    await requestPasswordReset(email)

    expect(getSentEmails(email)).toStrictEqual([])
  })

  it.each([
    {
      locale: "pl-PL",
      referer: `${TEST_APP_URL}/pl-PL${ROUTES.RESET_PASSWORD}?token=reset`,
      signIn: `${TEST_APP_URL}/pl-PL${ROUTES.SIGN_IN}`,
    },
    { locale: "en-US", referer: undefined, signIn: `${TEST_APP_URL}${ROUTES.SIGN_IN}` },
  ])(
    "tells the account its password changed, in the language of the reset page $referer",
    async ({ locale, referer, signIn: signInUrl }) => {
      const { account } = await signUpAndVerify()
      await requestPasswordReset(account.email)
      vi.mocked(getRequest).mockReturnValue(
        new Request(`${TEST_APP_URL}/_serverFn/reset-password`, { headers: referer === undefined ? {} : { referer } }),
      )

      await auth.api.resetPassword({ body: { newPassword: NEW_PASSWORD, token: resetToken(account.email) }, headers: browserHeaders() })
      await flushWaitUntil()

      const notice = getSentEmails(account.email).at(-1)
      expect(notice?.idempotencyKey?.startsWith(`${ACCOUNT_EMAIL_PURPOSE.PASSWORD_CHANGED}/`)).toBe(true)
      expect(notice?.html).toContain(`lang="${locale}"`)
      expect(notice?.html).toContain(`href="${signInUrl}"`)
    },
  )

  it("keeps the new password when the notice cannot be sent", async () => {
    const { account } = await signUpAndVerify()
    await requestPasswordReset(account.email)
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    failNextResendDelivery()

    await expect(
      auth.api.resetPassword({ body: { newPassword: NEW_PASSWORD, token: resetToken(account.email) }, headers: browserHeaders() }),
    ).resolves.toStrictEqual({ status: true })
    await flushWaitUntil()

    expect(consoleError).toHaveBeenCalledWith("[email] an account email could not be sent", expect.any(Error))
    const session = await auth.api.getSession({ headers: await signIn({ email: account.email, password: NEW_PASSWORD }) })
    expect(session?.user.email).toBe(account.email)
  })
})
