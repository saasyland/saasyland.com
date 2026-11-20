import { describe, expect, it } from "vite-plus/test"

import { PASSWORD_MIN_LENGTH } from "~/src/integrations/better-auth/auth.constraints"

import { verificationZodSchemas } from "~/src/modules/verification/verification.zod"

describe("verification zod schemas", () => {
  it("accepts valid email on forgot password", () => {
    expect.hasAssertions()
    expect(verificationZodSchemas.forgotPassword.safeParse({ email: "user@example.com" }).success).toBe(true)
  })

  it("rejects invalid email on forgot password", () => {
    expect.hasAssertions()
    expect(verificationZodSchemas.forgotPassword.safeParse({ email: "invalid" }).success).toBe(false)
  })

  it("accepts a password of the minimum length on the reset password form, without a confirmation", () => {
    expect(verificationZodSchemas.resetPasswordForm.safeParse({ password: "a".repeat(PASSWORD_MIN_LENGTH) }).success).toBe(true)
  })

  it("rejects a password shorter than the minimum length on the reset password form", () => {
    expect(verificationZodSchemas.resetPasswordForm.safeParse({ password: "a".repeat(PASSWORD_MIN_LENGTH - 1) }).success).toBe(false)
  })
})
