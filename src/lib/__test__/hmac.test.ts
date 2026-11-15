import { describe, expect, it } from "vite-plus/test"

import { signHmac, verifyHmac } from "~/src/lib/hmac"

const SIGNED = { info: "example:purpose", message: "0.1.0.mabc12", secret: "a-test-secret-that-is-long-enough" }
const HMAC_SHA256_HEX = /^[\da-f]{64}$/u

describe("signHmac and verifyHmac", () => {
  it("sign a message as the hex of an HMAC-SHA-256 and accept that signature", async () => {
    const signature = await signHmac(SIGNED)

    expect(signature).toMatch(HMAC_SHA256_HEX)
    await expect(signHmac(SIGNED)).resolves.toBe(signature)
    await expect(verifyHmac({ ...SIGNED, signature })).resolves.toBe(true)
  })

  it("derive a separate key for every purpose and secret", async () => {
    const signature = await signHmac(SIGNED)
    const otherPurpose = { ...SIGNED, info: "example:other-purpose" }
    const otherSecret = { ...SIGNED, secret: "another-secret-that-is-long-enough" }

    await expect(signHmac(otherPurpose)).resolves.not.toBe(signature)
    await expect(signHmac(otherSecret)).resolves.not.toBe(signature)
    await expect(verifyHmac({ ...otherPurpose, signature })).resolves.toBe(false)
    await expect(verifyHmac({ ...otherSecret, signature })).resolves.toBe(false)
    await expect(verifyHmac({ ...SIGNED, message: "0.1.1.mabc12", signature })).resolves.toBe(false)
  })
})
