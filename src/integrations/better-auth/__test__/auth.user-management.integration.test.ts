import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { flushWaitUntil } from "~/src/platform/testing/mocks/cloudflare"
import { getSentEmails } from "~/src/platform/testing/mocks/resend"

import {
  browserHeaders,
  createTestAccount,
  postJson,
  signIn,
  signUp,
  signUpAndVerify,
} from "~/src/integrations/better-auth/__test__/fixtures/auth.harness"
import { auth } from "~/src/integrations/better-auth/auth.server"

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"

import { ROUTES } from "~/src/routes"

const A_MINUTE_LATER_MS = 60_000

afterEach(() => {
  vi.useRealTimers()
})

describe("auth update user", () => {
  it("updates the signed-in user's name", async () => {
    const { headers } = await signUpAndVerify()

    await auth.api.updateUser({ body: { name: "Updated Name" }, headers })

    const session = await auth.api.getSession({ headers })
    expect(session?.user.name).toBe("Updated Name")
  })

  it("rejects an email change sent straight to update-user", async () => {
    const { headers } = await signUpAndVerify()

    const response = await auth.handler(
      postJson(
        `${ROUTES.API_AUTH_BASE}${ROUTES.API_AUTH.UPDATE_USER}`,
        { email: createTestAccount().email },
        { cookie: headers.get("cookie") ?? "" },
      ),
    )

    expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
    await expect(response.json()).resolves.toMatchObject({ message: "Email can not be updated" })
  })
})

describe("auth send verification email", () => {
  it("resends verification to an unverified user without a session", async () => {
    const { email } = await signUp()
    vi.useFakeTimers({ now: Date.now() + A_MINUTE_LATER_MS, toFake: ["Date"] })

    await auth.api.sendVerificationEmail({ body: { email }, headers: browserHeaders() })
    await flushWaitUntil()

    expect(getSentEmails(email)).toHaveLength(2)
  })

  it("rejects a resend when the signed-in email is already verified", async () => {
    const { account, headers } = await signUpAndVerify()

    await expect(auth.api.sendVerificationEmail({ body: { email: account.email }, headers })).rejects.toThrow("Email is already verified")
  })
})

describe("auth revoke session", () => {
  it("revokes another active session while keeping the current one", async () => {
    const { account, headers: firstSession } = await signUpAndVerify()
    const secondSession = await signIn(account)
    const sessions = await auth.api.listSessions({ headers: secondSession })
    const current = await auth.api.getSession({ headers: secondSession })
    const other = sessions.find(({ id }) => id !== current?.session.id)

    await auth.api.revokeSession({ body: { token: other?.token ?? "" }, headers: secondSession })

    await expect(auth.api.listSessions({ headers: secondSession })).resolves.toHaveLength(1)
    await expect(auth.api.getSession({ headers: firstSession })).resolves.toBeNull()
  })
})
