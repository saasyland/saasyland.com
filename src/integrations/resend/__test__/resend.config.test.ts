import { env } from "cloudflare:workers"

import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { resendClient } from "~/src/integrations/resend/resend.config"

vi.mock(import("@tanstack/react-start/server-only"), () => ({}))

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe("resendClient", () => {
  it("builds a new client with the API key each time an email is sent", () => {
    const client = resendClient()

    expect(client.key).toBe(env.RESEND_API_KEY)
    expect(client.emails).toHaveProperty("send")
    expect(resendClient()).not.toBe(client)
  })

  it("loads without an API key and asks for one only when a client is built", async () => {
    vi.stubEnv("RESEND_API_KEY", "")
    vi.resetModules()

    const config = await import("~/src/integrations/resend/resend.config")

    expect(() => config.resendClient()).toThrow(/API key/u)
  })
})
