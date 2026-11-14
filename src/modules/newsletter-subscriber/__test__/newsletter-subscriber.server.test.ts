import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { ENVIRONMENT } from "~/src/modules/_core/constants/api"
import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { newsletterRequestOrigin } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.server"

vi.mock(import("@tanstack/react-start/server-only"), () => ({}))

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("newsletter request origin", () => {
  it.each([
    { mode: ENVIRONMENT.PRODUCTION, origin: "https://saasyland.com" },
    { mode: ENVIRONMENT.PREVIEW, origin: "https://preview.saasyland.com" },
    { mode: ENVIRONMENT.DEVELOPMENT, origin: "http://localhost:3000" },
    { mode: ENVIRONMENT.DEVELOPMENT, origin: "http://127.0.0.1:3000" },
    { mode: ENVIRONMENT.TEST, origin: "http://127.0.0.1:3020" },
  ])("accepts $origin, a host the $mode build trusts", ({ mode, origin }) => {
    vi.stubEnv("MODE", mode)

    expect(newsletterRequestOrigin(new Request(`${origin}/_serverFn/subscribe?unrelated=value`))).toBe(origin)
  })

  it.each([
    { mode: ENVIRONMENT.PRODUCTION, origin: "https://preview.saasyland.com" },
    { mode: ENVIRONMENT.PRODUCTION, origin: "http://saasyland.com" },
    { mode: ENVIRONMENT.PRODUCTION, origin: "http://localhost:3000" },
    { mode: ENVIRONMENT.PRODUCTION, origin: "https://saasyland.com.example.test" },
    { mode: ENVIRONMENT.PREVIEW, origin: "https://saasyland-preview.account.workers.dev" },
    { mode: ENVIRONMENT.DEVELOPMENT, origin: "http://127.0.0.1:3020" },
    { mode: ENVIRONMENT.DEVELOPMENT, origin: "https://example.test" },
    { mode: ENVIRONMENT.TEST, origin: "ftp://localhost:3000" },
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
