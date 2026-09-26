import { describe, expect, it } from "vite-plus/test"

import { accountZodSchemas } from "~/src/modules/account/account.zod"

describe("account zod schemas", () => {
  it("rejects empty select payloads", () => {
    expect.hasAssertions()
    expect(accountZodSchemas.select.safeParse({}).success).toBe(false)
  })

  it.each([{}, { callbackURL: "https://example.com/pl-PL/app" }, { callbackURL: "//example.com/pl-PL/app" }])(
    "rejects a change email request that does not name the internal page it started on: %j",
    (callback) => {
      expect(accountZodSchemas.changeEmail.safeParse({ ...callback, newEmail: "ada@example.com" }).success).toBe(false)
    },
  )

  it("accepts matching passwords on change password form", () => {
    expect.hasAssertions()
    expect(
      accountZodSchemas.changePasswordForm.safeParse({
        confirmNewPassword: "Secret1!",
        currentPassword: "OldSecret1!",
        newPassword: "Secret1!",
      }).success,
    ).toBe(true)
  })

  it("rejects mismatched new passwords on change password form", () => {
    expect.hasAssertions()
    expect(
      accountZodSchemas.changePasswordForm.safeParse({
        confirmNewPassword: "Secret2!",
        currentPassword: "OldSecret1!",
        newPassword: "Secret1!",
      }).success,
    ).toBe(false)
  })
})
