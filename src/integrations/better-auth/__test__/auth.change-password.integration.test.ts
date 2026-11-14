import { describe, expect, it } from "vite-plus/test"

import { AUTH_TEST_PASSWORD, browserHeaders, signIn, signUpAndVerify } from "~/src/integrations/better-auth/__test__/fixtures/auth.harness"
import { auth } from "~/src/integrations/better-auth/auth.server"

const UPDATED_PASSWORD = "UpdatedSecret1!"

describe("auth change password", () => {
  it("changes the password for an authenticated credential user", async () => {
    const { account, headers } = await signUpAndVerify()

    await auth.api.changePassword({
      body: { currentPassword: account.password, newPassword: UPDATED_PASSWORD, revokeOtherSessions: false },
      headers,
    })

    const session = await auth.api.getSession({ headers: await signIn({ email: account.email, password: UPDATED_PASSWORD }) })
    expect(session?.user.email).toBe(account.email)
    await expect(signIn(account)).rejects.toThrow("Invalid email or password")
  })

  it("rejects change-password when the current password is wrong", async () => {
    const { headers } = await signUpAndVerify()

    await expect(
      auth.api.changePassword({
        body: { currentPassword: "WrongPass1!", newPassword: UPDATED_PASSWORD, revokeOtherSessions: false },
        headers,
      }),
    ).rejects.toThrow("Invalid password")
  })

  it("requires an authenticated session", async () => {
    await expect(
      auth.api.changePassword({
        body: { currentPassword: AUTH_TEST_PASSWORD, newPassword: UPDATED_PASSWORD, revokeOtherSessions: false },
        headers: browserHeaders(),
      }),
    ).rejects.toThrow("Unauthorized")
  })
})
