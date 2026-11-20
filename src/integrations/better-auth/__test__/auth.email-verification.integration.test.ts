import { getRequest } from "@tanstack/react-start/server"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { TEST_APP_URL } from "~/src/platform/testing/lib/test-request"
import { flushWaitUntil } from "~/src/platform/testing/mocks/cloudflare"
import { getSentEmails } from "~/src/platform/testing/mocks/resend"

import {
  browserHeaders,
  browserRequest,
  emailLink,
  emailToken,
  findUser,
  postJson,
  sessionCookie,
  signUp,
  signUpAndVerify,
} from "~/src/integrations/better-auth/__test__/fixtures/auth.harness"
import { auth } from "~/src/integrations/better-auth/auth.server"

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"

import { ROUTES } from "~/src/routes"

const A_MINUTE_MS = 60_000

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

const signInFrom = async (account: { email: string; password: string }, referer: string | undefined) => {
  const request = postJson(`${ROUTES.API_AUTH_BASE}${ROUTES.API_AUTH.SIGN_IN_EMAIL}`, account)
  if (referer !== undefined) {
    request.headers.set("referer", referer)
  }
  vi.mocked(getRequest).mockReturnValue(request)
  const response = await auth.handler(request)
  await flushWaitUntil()
  return response
}

describe("signing in before verifying", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it.each([
    {
      link: `${TEST_APP_URL}/pl-PL${ROUTES.VERIFY_EMAIL}?redirect=%2Fpl-PL%2Fapp%3Ftier%3Dcomplete&amp;token=`,
      referer: `${TEST_APP_URL}/pl-PL${ROUTES.SIGN_IN}?redirect=%2Fpl-PL%2Fapp%3Ftier%3Dcomplete`,
      subject: "Potwierdź adres e-mail",
    },
    {
      link: `${TEST_APP_URL}${ROUTES.VERIFY_EMAIL}?token=`,
      referer: `${TEST_APP_URL}${ROUTES.SIGN_IN}`,
      subject: "Verify your email address",
    },
    {
      link: `${TEST_APP_URL}${ROUTES.VERIFY_EMAIL}?token=`,
      referer: `https://example.org/pl-PL${ROUTES.SIGN_IN}?redirect=%2Fpl-PL%2Fapp`,
      subject: "Verify your email address",
    },
    { link: `${TEST_APP_URL}${ROUTES.VERIFY_EMAIL}?token=`, referer: undefined, subject: "Verify your email address" },
  ])(
    "refuses the session and sends a fresh link in the language and with the return path of the sign-in page $referer",
    async ({ link, referer, subject }) => {
      const account = await signUp()
      vi.useFakeTimers({ now: Date.now() + A_MINUTE_MS, toFake: ["Date"] })

      const response = await signInFrom(account, referer)

      expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
      expect(response.headers.getSetCookie()).toStrictEqual([])
      const deliveries = getSentEmails(account.email)
      expect(deliveries).toHaveLength(2)
      expect(deliveries[1]?.subject).toBe(subject)
      expect(deliveries[1]?.html).toContain(`href="${link}`)
    },
  )

  it("sends the fresh link even when the sign-in falls in the same second as the sign-up, whose token is the same", async () => {
    vi.useFakeTimers({ now: Date.now(), toFake: ["Date"] })
    const account = await signUp()

    const response = await signInFrom(account, undefined)

    expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
    const deliveries = getSentEmails(account.email)
    expect(deliveries).toHaveLength(2)
    const [signUpEmail, signInEmail] = deliveries
    const token = /token=(?<token>[\w.-]+)/u.exec(signUpEmail?.html ?? "")?.groups?.["token"]
    expect(signInEmail?.html).toContain(`token=${String(token)}`)
    expect(signInEmail?.idempotencyKey).not.toBe(signUpEmail?.idempotencyKey)
  })

  it("sends nothing when the password is wrong, so a stranger cannot trigger the email", async () => {
    const account = await signUp()

    const response = await signInFrom({ ...account, password: "Wrong-Password1!" }, undefined)

    expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    expect(getSentEmails(account.email)).toHaveLength(1)
  })
})
