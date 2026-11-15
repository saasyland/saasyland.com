import { describe, expect, it } from "vite-plus/test"

import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"

import { userZodSchemas } from "~/src/modules/user/user.zod"

const USER_ID = "00000000-0000-7000-8000-000000000001"

describe("user zod schemas", () => {
  it.each([-60, 0, 0.5])("rejects invalid ban duration %s", (banExpiresIn) => {
    expect(userZodSchemas.banUser.safeParse({ banExpiresIn, userId: USER_ID }).success).toBe(false)
  })

  it("accepts valid create payloads", () => {
    expect.hasAssertions()
    expect(
      userZodSchemas.createUser.safeParse({
        email: "user@example.com",
        name: "User",
        password: "Secret1!",
        role: ROLE_CODES.CUSTOMER,
      }).success,
    ).toBe(true)
  })

  it("creates an account only with an initial password and a known role", () => {
    expect.hasAssertions()
    const account = { email: "user@example.com", name: "User", password: "Secret1!", role: ROLE_CODES.CUSTOMER }
    expect(userZodSchemas.createUser.safeParse({ ...account, password: undefined }).success).toBe(false)
    expect(userZodSchemas.createUser.safeParse({ ...account, role: "owner" }).success).toBe(false)
  })

  it("renames a user and refuses an empty name", () => {
    expect.hasAssertions()
    expect(userZodSchemas.updateUser.safeParse({ name: "Grace", userId: USER_ID }).success).toBe(true)
    expect(userZodSchemas.updateUser.safeParse({ name: "", userId: USER_ID }).success).toBe(false)
  })

  it("accepts a catalogued time zone as a preference and refuses any other", () => {
    expect.hasAssertions()
    expect(userZodSchemas.updatePreferences.safeParse({ timezone: "Europe/Warsaw" }).success).toBe(true)
    expect(userZodSchemas.updatePreferences.safeParse({ timezone: "Mars/Olympus_Mons" }).success).toBe(false)
  })

  it("accepts a strong password on set user password form", () => {
    expect.hasAssertions()
    expect(userZodSchemas.setUserPasswordForm.safeParse({ newPassword: "Secret1!" }).success).toBe(true)
  })

  it("rejects a weak password on set user password form", () => {
    expect.hasAssertions()
    expect(userZodSchemas.setUserPasswordForm.safeParse({ newPassword: "weak" }).success).toBe(false)
  })
})
