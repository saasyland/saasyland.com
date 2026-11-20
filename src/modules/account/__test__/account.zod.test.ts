import { describe, expect, it } from "vite-plus/test"

import { PASSWORD_MIN_LENGTH } from "~/src/integrations/better-auth/auth.constraints"

import { accountZodSchemas } from "~/src/modules/account/account.zod"

describe("account zod schemas", () => {
  it.each([{}, { callbackURL: "https://example.com/pl-PL/app" }, { callbackURL: "//example.com/pl-PL/app" }])(
    "rejects a change email request that does not name the internal page it started on: %j",
    (callback) => {
      expect(accountZodSchemas.changeEmail.safeParse({ ...callback, newEmail: "ada@example.com" }).success).toBe(false)
    },
  )

  it("accepts a new password of the minimum length on the change password form, without a confirmation", () => {
    expect(
      accountZodSchemas.changePasswordForm.safeParse({ currentPassword: "OldSecret1!", newPassword: "a".repeat(PASSWORD_MIN_LENGTH) })
        .success,
    ).toBe(true)
  })

  it("rejects a new password shorter than the minimum length on the change password form", () => {
    expect(
      accountZodSchemas.changePasswordForm.safeParse({ currentPassword: "OldSecret1!", newPassword: "a".repeat(PASSWORD_MIN_LENGTH - 1) })
        .success,
    ).toBe(false)
  })
})
