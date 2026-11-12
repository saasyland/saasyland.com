import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { newsletterRequestOrigin } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.server"

vi.mock(import("@tanstack/react-start/server-only"), () => ({}))

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("newsletter request origin", () => {
  it.each([
    { mode: "production", origin: "https://saasyland.com" },
    { mode: "preview", origin: "https://preview.saasyland.com" },
    { mode: "development", origin: "http://localhost:3000" },
    { mode: "development", origin: "http://127.0.0.1:3000" },
    { mode: "test", origin: "http://127.0.0.1:3020" },
  ])("accepts $origin, a host the $mode build trusts", ({ mode, origin }) => {
    vi.stubEnv("MODE", mode)

    expect(newsletterRequestOrigin(new Request(`${origin}/_serverFn/subscribe?unrelated=value`))).toBe(origin)
  })

  it.each([
    { mode: "production", origin: "https://preview.saasyland.com" },
    { mode: "production", origin: "http://saasyland.com" },
    { mode: "production", origin: "http://localhost:3000" },
    { mode: "production", origin: "https://saasyland.com.example.test" },
    { mode: "preview", origin: "https://saasyland-preview.account.workers.dev" },
    { mode: "development", origin: "http://127.0.0.1:3020" },
    { mode: "development", origin: "https://example.test" },
    { mode: "test", origin: "ftp://localhost:3000" },
  ])("rejects $origin in the $mode build", ({ mode, origin }) => {
    vi.stubEnv("MODE", mode)

    expect(() => newsletterRequestOrigin(new Request(origin))).toThrow(ERROR_CODES.FORBIDDEN)
  })

  it("ignores attacker-controlled origin and forwarding headers", () => {
    const request = new Request("http://localhost:3000/_serverFn/subscribe", {
      headers: {
        host: "attacker.example",
        origin: "https://attacker.example",
        "x-forwarded-host": "attacker.example",
        "x-forwarded-proto": "https",
      },
    })

    expect(newsletterRequestOrigin(request)).toBe("http://localhost:3000")
  })
})
