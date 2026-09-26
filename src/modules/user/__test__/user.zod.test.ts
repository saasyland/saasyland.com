import { describe, expect, it } from "vite-plus/test"

import { userZodSchemas } from "~/src/modules/user/user.zod"

const USER_ID = "00000000-0000-7000-8000-000000000001"

describe("user zod schemas", () => {
  it.each([-60, 0, 0.5])("rejects invalid ban duration %s", (banExpiresIn) => {
    expect(userZodSchemas.banUser.safeParse({ banExpiresIn, userId: USER_ID }).success).toBe(false)
  })

  it("accepts valid insert payloads", () => {
    expect.hasAssertions()
    expect(
      userZodSchemas.insert.safeParse({
        email: "user@example.com",
        id: USER_ID,
        name: "User",
      }).success,
    ).toBe(true)
  })

  it("accepts valid create payloads", () => {
    expect.hasAssertions()
    expect(
      userZodSchemas.createUser.safeParse({
        email: "user@example.com",
        name: "User",
      }).success,
    ).toBe(true)
  })

  it("rejects update payloads with no mutable fields", () => {
    expect.hasAssertions()
    expect(
      userZodSchemas.updateUser.safeParse({ userId: USER_ID }).error?.issues.some((issue) => issue.message === "atLeastOneFieldRequired"),
    ).toBe(true)
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
