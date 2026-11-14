import { describe, expect, it } from "vite-plus/test"

import { TEST_APP_URL } from "~/src/platform/testing/lib/test-request"
import { getSentEmails } from "~/src/platform/testing/mocks/resend"

import {
  browserHeaders,
  browserRequest,
  emailLink,
  emailToken,
  findUser,
  sessionCookie,
  signUp,
  signUpAndVerify,
} from "~/src/integrations/better-auth/__test__/fixtures/auth.harness"
import { auth } from "~/src/integrations/better-auth/auth.server"

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"

import { ROUTES } from "~/src/routes"

const verificationRequest = (email: string, callbackURL: string): Request => {
  const query = new URLSearchParams({ callbackURL, token: emailToken(email, ROUTES.VERIFY_EMAIL) })
  return browserRequest(`${ROUTES.API_AUTH_VERIFY_EMAIL}?${query}`)
}

describe("auth email verification", () => {
  it("emails a link to this site's verification page with a token on sign-up", async () => {
    const { email } = await signUp()

    expect(getSentEmails(email)).toHaveLength(1)
    expect(emailLink(email, ROUTES.VERIFY_EMAIL).pathname).toBe(ROUTES.VERIFY_EMAIL)
    expect(emailToken(email, ROUTES.VERIFY_EMAIL)).not.toBe("")
  })

  it("verifies the address and signs the user in", async () => {
    const { account, headers } = await signUpAndVerify()

    const session = await auth.api.getSession({ headers })

    expect(session?.user).toMatchObject({ email: account.email, emailVerified: true })
    await expect(findUser(account.email)).resolves.toMatchObject({ emailVerified: true })
  })

  it("sets a usable session cookie before redirecting the verification link to its localized callback", async () => {
    const { email } = await signUp()
    const callbackURL = `${TEST_APP_URL}/pl-PL${ROUTES.VERIFY_EMAIL}?verified=true`

    const response = await auth.handler(verificationRequest(email, callbackURL))

    expect(response.status).toBe(HTTP_STATUS.FOUND)
    expect(response.headers.get("location")).toBe(callbackURL)
    expect(response.headers.getSetCookie().join("; ")).toContain("HttpOnly")
    const session = await auth.api.getSession({ headers: browserHeaders({ cookie: sessionCookie(response.headers) }) })
    expect(session?.user).toMatchObject({ email, emailVerified: true })
  })

  it("does not create another session when a signed-out user reopens an already-used verification link", async () => {
    const { email } = await signUp()
    const callbackURL = `${TEST_APP_URL}${ROUTES.VERIFY_EMAIL}?verified=true`
    await auth.handler(verificationRequest(email, callbackURL))

    const response = await auth.handler(verificationRequest(email, callbackURL))

    expect(response.status).toBe(HTTP_STATUS.FOUND)
    expect(response.headers.get("location")).toBe(callbackURL)
    expect(response.headers.getSetCookie()).toStrictEqual([])
  })

  it("redirects an invalid token to the localized error page without setting a session cookie", async () => {
    const callbackURL = `${TEST_APP_URL}/pl-PL${ROUTES.VERIFY_EMAIL}?verified=true`
    const query = new URLSearchParams({ callbackURL, token: "invalid-token" })

    const response = await auth.handler(browserRequest(`${ROUTES.API_AUTH_VERIFY_EMAIL}?${query}`))

    expect(response.status).toBe(HTTP_STATUS.FOUND)
    expect(response.headers.get("location")).toBe(`${callbackURL}&error=INVALID_TOKEN`)
    expect(response.headers.getSetCookie()).toStrictEqual([])
  })

  it("rejects an invalid verification token", async () => {
    await expect(auth.api.verifyEmail({ headers: browserHeaders(), query: { token: "invalid-token" } })).rejects.toThrow("Invalid token")
  })
})
