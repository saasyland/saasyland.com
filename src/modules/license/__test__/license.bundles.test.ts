import { API_LIMIT } from "@saasyland/stack/api"
import { assert, describe, expect, it } from "vite-plus/test"

import { SIGNED_BUNDLE_PATH, bundleObjectKey, signBundle, verifyBundle } from "~/src/modules/license/license.bundles"
import { BUNDLE_ARCHIVE_EXTENSION, BUNDLE_PATH_PREFIX } from "~/src/modules/license/license.constants"
import { createPlayback } from "~/src/modules/video/video.playback"

import { MILLISECONDS_PER_SECOND } from "~/src/lib/duration"

const SECRET = "a-test-secret-that-is-long-enough"
const HOST = "saasyland.test"
const VERSION = "0.1.0-beta.2"
const NOW = Date.parse("2026-11-15T10:20:30.456Z")
const ISSUED_SECOND = Date.parse("2026-11-15T10:20:30.000Z")
const PLAYBACK_GRANT = /^\/media\/(?<expiry>[\da-z]+)\.(?<signature>[\da-f]{64})\//u

const signedClaim = async (now = NOW) => {
  const signed = await signBundle({ host: HOST, now, secret: SECRET, version: VERSION })
  const groups = SIGNED_BUNDLE_PATH.exec(signed.url)?.pathname.groups
  assert(groups?.["expiry"] !== undefined && groups["signature"] !== undefined)
  return { expiry: groups["expiry"], signature: groups["signature"], signed }
}

describe("bundle URLs", () => {
  it("keys each release's archive by its version", () => {
    expect(bundleObjectKey(VERSION)).toBe(`${VERSION}${BUNDLE_ARCHIVE_EXTENSION}`)
  })

  it("signs an HTTPS URL to the release's archive on the host that answered, which expires one TTL after the second it was issued", async () => {
    const { signed } = await signedClaim()
    const url = new URL(signed.url)

    expect(url.protocol).toBe("https:")
    expect(url.host).toBe(HOST)
    expect(url.pathname.startsWith(`${BUNDLE_PATH_PREFIX}/`)).toBe(true)
    expect(url.pathname.endsWith(`/${bundleObjectKey(VERSION)}`)).toBe(true)
    expect(SIGNED_BUNDLE_PATH.exec(url)?.pathname.groups["version"]).toBe(VERSION)
    expect(Date.parse(signed.expiresAt)).toBe(ISSUED_SECOND + API_LIMIT.BUNDLE_URL_TTL_SECONDS * MILLISECONDS_PER_SECOND)
  })

  it("accepts its own signature until the URL expires", async () => {
    const { expiry, signature, signed } = await signedClaim()
    const expiresAt = Date.parse(signed.expiresAt)

    await expect(verifyBundle({ expiry, now: NOW, secret: SECRET, signature, version: VERSION })).resolves.toBe(true)
    await expect(verifyBundle({ expiry, now: expiresAt - 1, secret: SECRET, signature, version: VERSION })).resolves.toBe(true)
    await expect(verifyBundle({ expiry, now: expiresAt, secret: SECRET, signature, version: VERSION })).resolves.toBe(false)
  })

  it("rejects another version, another secret, a later expiry or a changed signature", async () => {
    const { expiry, signature } = await signedClaim()
    const laterExpiry = (Number.parseInt(expiry, 36) + API_LIMIT.BUNDLE_URL_TTL_SECONDS).toString(36)
    const changed = `${signature.slice(0, -1)}${signature.endsWith("0") ? "1" : "0"}`

    await expect(verifyBundle({ expiry, now: NOW, secret: SECRET, signature, version: "0.1.0" })).resolves.toBe(false)
    await expect(verifyBundle({ expiry, now: NOW, secret: "another-secret", signature, version: VERSION })).resolves.toBe(false)
    await expect(verifyBundle({ expiry: laterExpiry, now: NOW, secret: SECRET, signature, version: VERSION })).resolves.toBe(false)
    await expect(verifyBundle({ expiry, now: NOW, secret: SECRET, signature: changed, version: VERSION })).resolves.toBe(false)
  })

  it("signs with a key of its own, so a video playback signature never opens a bundle", async () => {
    const playback = await createPlayback({ now: NOW, secret: SECRET, video: { captionLocales: [], id: VERSION } })
    const groups = PLAYBACK_GRANT.exec(playback.src)?.groups
    assert(groups?.["expiry"] !== undefined && groups["signature"] !== undefined)

    await expect(
      verifyBundle({ expiry: groups["expiry"], now: NOW, secret: SECRET, signature: groups["signature"], version: VERSION }),
    ).resolves.toBe(false)
  })
})
