import { eq } from "drizzle-orm"
import { describe, expect, it } from "vite-plus/test"

import { browserHeaders, signIn, signUpAndVerify } from "~/src/integrations/better-auth/__test__/fixtures/auth.harness"
import { AUTH_PROVIDER } from "~/src/integrations/better-auth/auth.constants"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { user } from "~/src/modules/user/user.schema"

describe("auth sessions", () => {
  it("lists the active session of a signed-in user", async () => {
    const { headers } = await signUpAndVerify()

    await expect(auth.api.listSessions({ headers })).resolves.toHaveLength(1)
  })

  it("revokes other sessions while keeping the current one", async () => {
    const { account, headers: firstSession } = await signUpAndVerify()
    const secondSession = await signIn(account)
    await expect(auth.api.listSessions({ headers: secondSession })).resolves.toHaveLength(2)

    await auth.api.revokeOtherSessions({ headers: secondSession })

    await expect(auth.api.listSessions({ headers: secondSession })).resolves.toHaveLength(1)
    await expect(auth.api.getSession({ headers: firstSession })).resolves.toBeNull()
  })
})

describe("auth two-factor", () => {
  it("returns a TOTP URI and backup codes when a verified user enables two-factor", async () => {
    const { account, headers } = await signUpAndVerify()

    const result = await auth.api.enableTwoFactor({ body: { password: account.password }, headers })

    expect(result).toHaveProperty("method", "totp")
    expect(result).toHaveProperty("totpURI", expect.stringMatching(/^otpauth:\/\/totp\//u))
    expect(result).toHaveProperty("backupCodes", expect.arrayContaining([expect.any(String)]))
  })
})

describe("auth account linking", () => {
  it("lists the credential account of a password user", async () => {
    const { headers } = await signUpAndVerify()

    const accounts = await auth.api.listUserAccounts({ headers })

    expect(accounts.map(({ providerId }) => providerId)).toStrictEqual([AUTH_PROVIDER.CREDENTIAL])
  })

  it("requires a session before listing linked accounts", async () => {
    await expect(auth.api.listUserAccounts({ headers: browserHeaders() })).rejects.toThrow("Unauthorized")
  })
})

describe("auth bans", () => {
  it("prevents a banned user from signing in", async () => {
    const { account, userId } = await signUpAndVerify()
    await db.update(user).set({ banReason: "test ban", banned: true }).where(eq(user.id, userId))

    await expect(signIn(account)).rejects.toThrow("banned")
  })
})
