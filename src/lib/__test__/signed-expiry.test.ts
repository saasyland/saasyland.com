import { describe, expect, it } from "vite-plus/test"

import { isUnexpired, signedExpiry } from "~/src/lib/signed-expiry"

const NOW = Date.parse("2026-11-17T10:20:00.000Z")
const ONE_HOUR_MS = 3_600_000
const TTL_SECONDS = 7200

describe("signed expiry", () => {
  it("rounds the expiry up to the next whole hour after the time to live", () => {
    const expiresAt = Number.parseInt(signedExpiry({ now: NOW, ttlSeconds: TTL_SECONDS }), 36) * 1000

    expect(expiresAt).toBe(Date.parse("2026-11-17T13:00:00.000Z"))
    expect(signedExpiry({ now: NOW + ONE_HOUR_MS / 4, ttlSeconds: TTL_SECONDS })).toBe(signedExpiry({ now: NOW, ttlSeconds: TTL_SECONDS }))
  })

  it("is live until the expiry and not after", () => {
    const expires = signedExpiry({ now: NOW, ttlSeconds: TTL_SECONDS })
    const expiresAt = Number.parseInt(expires, 36) * 1000

    expect(isUnexpired({ expires, now: expiresAt - 1 })).toBe(true)
    expect(isUnexpired({ expires, now: expiresAt })).toBe(false)
  })
})
