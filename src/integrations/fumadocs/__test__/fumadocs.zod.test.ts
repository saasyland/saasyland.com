import { describe, expect, it } from "vite-plus/test"

import { contentSlugSchema } from "~/src/integrations/fumadocs/fumadocs.zod"

describe("content slug boundary", () => {
  it.each(["", "getting-started", "guides/日本語", "docs/zażółć", "features/auth_2"])("accepts a content slug: %s", (slug) => {
    expect(contentSlugSchema.safeParse(slug).success).toBe(true)
  })
  it.each([
    undefined,
    42,
    ["docs"],
    "../secrets",
    "a/../../b",
    "/absolute",
    "a//b",
    "a?token=secret",
    "a#fragment",
    "a%2fb",
    "a".repeat(2049),
  ])("rejects malformed or oversized input", (slug) => {
    expect(contentSlugSchema.safeParse(slug).success).toBe(false)
  })
})
