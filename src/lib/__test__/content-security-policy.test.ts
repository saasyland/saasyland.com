import { describe, expect, it } from "vite-plus/test"

import { SECURITY_HEADERS } from "~/src/modules/_core/constants/api"

import { createNonce, renderedPagePolicy, scriptPolicy } from "~/src/lib/content-security-policy"

const SAMPLE_SIZE = 50

describe("scriptPolicy", () => {
  it("allows the given sources and the scripts they load, and keeps plugins and base URLs off", () => {
    expect(scriptPolicy(["'sha256-one'", "'sha256-two'"])).toBe(
      "script-src 'sha256-one' 'sha256-two' 'strict-dynamic' 'unsafe-inline' https:; object-src 'none'; base-uri 'none'",
    )
  })

  it("leaves framing to the header, because browsers ignore frame-ancestors in a meta tag", () => {
    expect(scriptPolicy(["'sha256-one'"])).not.toContain("frame-ancestors")
  })
})

describe("renderedPagePolicy", () => {
  it("allows the scripts that carry the nonce and keeps every directive of the base policy", () => {
    const policy = renderedPagePolicy("0123456789abcdef0123456789abcdef")

    expect(policy).toBe(
      "script-src 'nonce-0123456789abcdef0123456789abcdef' 'strict-dynamic' 'unsafe-inline' https:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
    )
    expect(policy.split("; ")).toEqual(expect.arrayContaining(SECURITY_HEADERS["Content-Security-Policy"].split("; ")))
  })
})

describe("createNonce", () => {
  it("returns 128 random bits as 32 hex characters", () => {
    expect(createNonce()).toMatch(/^[\da-f]{32}$/u)
  })

  it("returns a different nonce on every call", () => {
    expect(new Set(Array.from({ length: SAMPLE_SIZE }, createNonce)).size).toBe(SAMPLE_SIZE)
  })
})
