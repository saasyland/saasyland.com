import { describe, expect, it } from "vite-plus/test"

import {
  callbackPathSchema,
  emailSchema,
  signInWithPasswordSchema,
  signUpWithPasswordSchema,
} from "~/src/integrations/better-auth/auth.zod"

describe("callback path schema", () => {
  it.each(["/app", "/pl-PL/app?tier=pro", "/auth/callback?redirect=%2Fapp"])("accepts the internal path %s", (path) => {
    expect(callbackPathSchema.safeParse(path).success).toBe(true)
  })

  it.each(["//evil.example", String.raw`/\evil.example`, "https://evil.example/app", "app", ""])(
    "rejects %s, which could leave the site",
    (path) => {
      expect(callbackPathSchema.safeParse(path).success).toBe(false)
    },
  )
})

describe("email schema component", () => {
  it("accepts valid email", () => {
    expect.hasAssertions()
    expect(emailSchema.safeParse("user@example.com").success).toBe(true)
  })

  it("rejects invalid email", () => {
    expect.hasAssertions()
    expect(emailSchema.safeParse("not-an-email").success).toBe(false)
  })
})

describe("sign up with password schema component", () => {
  it("accepts valid sign-up payload", () => {
    expect.hasAssertions()
    const result = signUpWithPasswordSchema.safeParse({
      confirmPassword: "Secret1!",
      email: "user@example.com",
      name: "User",
      password: "Secret1!",
    })
    expect(result.success).toBe(true)
  })

  it("rejects mismatched passwords", () => {
    expect.hasAssertions()
    const result = signUpWithPasswordSchema.safeParse({
      confirmPassword: "Secret2!",
      email: "user@example.com",
      name: "User",
      password: "Secret1!",
    })
    expect(result.success).toBe(false)
  })

  it("rejects weak password", () => {
    expect.hasAssertions()
    const result = signUpWithPasswordSchema.safeParse({
      confirmPassword: "weak",
      email: "user@example.com",
      name: "User",
      password: "weak",
    })
    expect(result.success).toBe(false)
  })
})

describe("sign in with password schema component", () => {
  it("accepts valid sign-in payload", () => {
    expect.hasAssertions()
    expect(
      signInWithPasswordSchema.safeParse({
        email: "user@example.com",
        password: "any-password",
      }).success,
    ).toBe(true)
  })

  it("rejects empty password", () => {
    expect.hasAssertions()
    expect(
      signInWithPasswordSchema.safeParse({
        email: "user@example.com",
        password: "",
      }).success,
    ).toBe(false)
  })

  it("rejects invalid email", () => {
    expect.hasAssertions()
    expect(
      signInWithPasswordSchema.safeParse({
        email: "not-an-email",
        password: "Secret1!",
      }).success,
    ).toBe(false)
  })
})
