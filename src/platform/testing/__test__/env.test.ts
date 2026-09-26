import { env } from "cloudflare:workers"

import { describe, expect, it } from "vite-plus/test"

const MIN_AUTH_SECRET_LENGTH = 64

describe("environment variables", () => {
  it("loads the local Worker fixture bindings", () => {
    expect.hasAssertions()
    expect(env.AUTH_SECRET.length).toBeGreaterThanOrEqual(MIN_AUTH_SECRET_LENGTH)
    expect(env.RESEND_API_KEY.startsWith("re_")).toBe(true)
  })
})

it("provides the Cloudflare KV cache binding", async () => {
  await env.CACHE.put("stars:test", "435")
  expect(await env.CACHE.get("stars:test")).toBe("435")
  await env.CACHE.delete("stars:test")
  expect(await env.CACHE.get("stars:test")).toBeNull()
})
