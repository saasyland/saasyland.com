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

  it("accepts a new password of the minimum length on the change password request, without a confirmation", () => {
    expect(
      accountZodSchemas.changePassword.safeParse({ currentPassword: "OldSecret1!", newPassword: "a".repeat(PASSWORD_MIN_LENGTH) }).success,
    ).toBe(true)
  })

  it("rejects a new password shorter than the minimum length on the change password request", () => {
    expect(
      accountZodSchemas.changePassword.safeParse({ currentPassword: "OldSecret1!", newPassword: "a".repeat(PASSWORD_MIN_LENGTH - 1) })
        .success,
    ).toBe(false)
  })
})

describe("account security schemas", () => {
  it.each([
    [{ newPassword: "a".repeat(PASSWORD_MIN_LENGTH) }, true],
    [{ newPassword: "a".repeat(PASSWORD_MIN_LENGTH - 1) }, false],
  ])("checks the length of a password an account adds: %j", (input, isValid) => {
    expect(accountZodSchemas.setPassword.safeParse(input).success).toBe(isValid)
  })

  it.each([
    [{ accountId: "01900000-0000-7000-8000-0000000000a1" }, true],
    [{ accountId: "" }, false],
    [{}, false],
  ])("needs the row ID of the account to disconnect: %j", (input, isValid) => {
    expect(accountZodSchemas.unlinkAccount.safeParse(input).success).toBe(isValid)
  })
})
