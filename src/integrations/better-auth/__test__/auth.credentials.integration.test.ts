import { describe, expect, it } from "vite-plus/test"

import { TEST_APP_URL } from "~/src/platform/testing/lib/test-request"
import { flushWaitUntil } from "~/src/platform/testing/mocks/cloudflare"
import { getSentEmails } from "~/src/platform/testing/mocks/resend"

import {
  browserHeaders,
  createTestAccount,
  findUser,
  signIn,
  signUp,
  verifyEmail,
} from "~/src/integrations/better-auth/__test__/fixtures/auth.harness"
import { DEFAULT_ROLE_CODE } from "~/src/integrations/better-auth/auth.access"
import { AUTH_PROVIDER } from "~/src/integrations/better-auth/auth.constants"
import { auth } from "~/src/integrations/better-auth/auth.server"

import { ROUTES } from "~/src/routes"

describe("auth email and password credentials", () => {
  it("signs up a new user with the default customer role and emails a verification link", async () => {
    const account = createTestAccount()

    const result = await auth.api.signUpEmail({ body: account, headers: browserHeaders() })
    await flushWaitUntil()

    expect(result.user).toMatchObject({ email: account.email, emailVerified: false, role: DEFAULT_ROLE_CODE })
    expect(result.token).toBeNull()
    expect(getSentEmails(account.email)).toHaveLength(1)
  })

  it("returns a generic user identity for a duplicate sign-up when verification is required", async () => {
    const account = createTestAccount()

    const first = await auth.api.signUpEmail({ body: account, headers: browserHeaders() })
    const duplicate = await auth.api.signUpEmail({ body: account, headers: browserHeaders() })
    await flushWaitUntil()

    expect(duplicate.user.email).toBe(account.email)
    expect(duplicate.user.id).not.toBe(first.user.id)
    expect(duplicate.token).toBeNull()
    await expect(findUser(account.email)).resolves.toMatchObject({ id: first.user.id })
  })

  it("signs in with valid credentials after email verification", async () => {
    const account = await signUp()
    await verifyEmail(account.email)

    const session = await auth.api.getSession({ headers: await signIn(account) })

    expect(session?.user.email).toBe(account.email)
  })

  it("rejects sign-in with an invalid password", async () => {
    const account = await signUp()
    await verifyEmail(account.email)

    await expect(signIn({ email: account.email, password: "WrongPass1!" })).rejects.toThrow("Invalid email or password")
  })

  it("signs out and clears the active session", async () => {
    const account = await signUp()
    await verifyEmail(account.email)
    const headers = await signIn(account)

    await auth.api.signOut({ headers })

    await expect(auth.api.getSession({ headers })).resolves.toBeNull()
  })

  it("blocks sign-in when email verification is required but not completed", async () => {
    const account = await signUp()

    await expect(signIn(account)).rejects.toThrow("Email not verified")
  })
})

describe("auth social providers", () => {
  it.each([
    [AUTH_PROVIDER.GITHUB, "https://github.com/login/oauth/authorize"],
    [AUTH_PROVIDER.GOOGLE, "https://accounts.google.com/o/oauth2/v2/auth"],
  ])("starts %s OAuth with a redirect to the provider", async (provider, authorizationUrl) => {
    const response = await auth.api.signInSocial({
      body: { callbackURL: `${TEST_APP_URL}${ROUTES.AUTH_CALLBACK}`, provider },
      headers: browserHeaders(),
    })

    expect(response.url).toContain(authorizationUrl)
  })
})
