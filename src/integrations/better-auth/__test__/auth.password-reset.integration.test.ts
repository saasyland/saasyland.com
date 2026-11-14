import { describe, expect, it } from "vite-plus/test"

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

import { ROUTES } from "~/src/routes"

const RESET_TOKEN = /\/reset-password\/(?<token>[^/]+)$/u
const NEW_PASSWORD = "NewSecret1!"

const requestPasswordReset = async (email: string): Promise<void> => {
  await auth.api.requestPasswordReset({ body: { email, redirectTo: ROUTES.RESET_PASSWORD }, headers: browserHeaders() })
  await flushWaitUntil()
}

const resetToken = (email: string): string => {
  const link = emailLink(email, `${ROUTES.API_AUTH_BASE}${ROUTES.API_AUTH.RESET_PASSWORD}/`)
  return RESET_TOKEN.exec(link.pathname)?.groups?.["token"] ?? ""
}

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
})
