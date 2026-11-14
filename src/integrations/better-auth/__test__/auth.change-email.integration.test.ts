import { describe, expect, it } from "vite-plus/test"

import { flushWaitUntil } from "~/src/platform/testing/mocks/cloudflare"
import { getSentEmails } from "~/src/platform/testing/mocks/resend"

import {
  browserHeaders,
  createTestAccount,
  emailToken,
  findUser,
  signUpAndVerify,
} from "~/src/integrations/better-auth/__test__/fixtures/auth.harness"
import { auth } from "~/src/integrations/better-auth/auth.server"

import { ROUTES } from "~/src/routes"

const changeEmail = async (headers: Headers, newEmail: string) => {
  const result = await auth.api.changeEmail({ body: { newEmail }, headers })
  await flushWaitUntil()
  return result
}

describe("auth change email", () => {
  it("confirms the change from the current address, verifies the new one and then stores it", async () => {
    const { account, headers } = await signUpAndVerify()
    const { email: newEmail } = createTestAccount()

    await changeEmail(headers, newEmail)
    await auth.api.verifyEmail({ headers, query: { token: emailToken(account.email, ROUTES.API_AUTH_VERIFY_EMAIL) } })
    await flushWaitUntil()

    await expect(findUser(account.email)).resolves.toMatchObject({ email: account.email })
    await auth.api.verifyEmail({ headers: browserHeaders(), query: { token: emailToken(newEmail, ROUTES.VERIFY_EMAIL) } })

    expect(await findUser(newEmail)).toMatchObject({ email: newEmail, emailVerified: true })
  })

  it("rejects changing to the same email address", async () => {
    const { account, headers } = await signUpAndVerify()

    await expect(auth.api.changeEmail({ body: { newEmail: account.email }, headers })).rejects.toThrow("Email is the same")
  })

  it("answers success without revealing that the target address belongs to another account", async () => {
    const existing = await signUpAndVerify()
    const { account, headers } = await signUpAndVerify()
    const emailsBefore = getSentEmails(account.email).length

    const result = await changeEmail(headers, existing.account.email)

    expect(result.status).toBe(true)
    expect(getSentEmails(account.email)).toHaveLength(emailsBefore)
    expect(getSentEmails(existing.account.email)).toHaveLength(1)
  })
})
