import { describe, expect, it } from "vite-plus/test"

import { createPlayback, verifyPlayback } from "~/src/modules/video/video.playback"
import type { Video } from "~/src/modules/video/video.types"

const SECRET = "a-test-secret-that-is-long-enough"
const VIDEO_ID = "0195a2b4-6c8d-7e9f-8a0b-1c2d3e4f5a6b"
const NOW = Date.parse("2026-11-13T10:20:00.000Z")
const SIX_HOURS = 21_600_000
const ONE_HOUR = 3_600_000
const SIGNED_PATH = /^\/media\/(?<expires>[\da-z]+)\.(?<signature>[\da-f]{64})\/(?<videoId>[\da-f-]{36})\/master\.m3u8$/u

const signedParts = async (now: number, captionLocales: Video["select"]["captionLocales"] = []) => {
  const playback = await createPlayback({ now, secret: SECRET, video: { captionLocales, id: VIDEO_ID } })
  const groups = SIGNED_PATH.exec(playback.src)?.groups
  return { expires: groups?.["expires"] ?? "", playback, signature: groups?.["signature"] ?? "" }
}

describe("video playback", () => {
  it("signs every file of the video under one expiring path", async () => {
    const { playback } = await signedParts(NOW, ["en-US", "pl-PL"])
    const base = playback.src.replace("/master.m3u8", "")

    expect(playback).toStrictEqual({
      captions: [
        { locale: "en-US", src: `${base}/captions/en-US.vtt` },
        { locale: "pl-PL", src: `${base}/captions/pl-PL.vtt` },
      ],
      poster: `${base}/poster.webp`,
      posterSmall: `${base}/poster-960.webp`,
      src: `${base}/master.m3u8`,
      storyboard: `${base}/storyboard.vtt`,
    })
  })

  it("expires at least six hours later, on the hour, so links issued within an hour match", async () => {
    const first = await signedParts(NOW)
    const later = await signedParts(NOW + ONE_HOUR / 2)
    const expiresAt = Number.parseInt(first.expires, 36) * 1000

    expect(expiresAt).toBeGreaterThanOrEqual(NOW + SIX_HOURS)
    expect(expiresAt % ONE_HOUR).toBe(0)
    expect(later.playback.src).toBe(first.playback.src)
  })

  it("accepts its own signature until it expires", async () => {
    const { expires, signature } = await signedParts(NOW)
    const expiresAt = Number.parseInt(expires, 36) * 1000

    await expect(verifyPlayback({ expires, now: NOW, secret: SECRET, signature, videoId: VIDEO_ID })).resolves.toBe(true)
    await expect(verifyPlayback({ expires, now: expiresAt - 1, secret: SECRET, signature, videoId: VIDEO_ID })).resolves.toBe(true)
    await expect(verifyPlayback({ expires, now: expiresAt, secret: SECRET, signature, videoId: VIDEO_ID })).resolves.toBe(false)
  })

  it("rejects another video, another secret, a later expiry or a changed signature", async () => {
    const { expires, signature } = await signedParts(NOW)
    const otherVideo = "0195a2b4-6c8d-7e9f-8a0b-000000000000"
    const laterExpiry = (Number.parseInt(expires, 36) + 3600).toString(36)
    const changed = `${signature.slice(0, -1)}${signature.endsWith("0") ? "1" : "0"}`

    await expect(verifyPlayback({ expires, now: NOW, secret: SECRET, signature, videoId: otherVideo })).resolves.toBe(false)
    await expect(verifyPlayback({ expires, now: NOW, secret: "another-secret", signature, videoId: VIDEO_ID })).resolves.toBe(false)
    await expect(verifyPlayback({ expires: laterExpiry, now: NOW, secret: SECRET, signature, videoId: VIDEO_ID })).resolves.toBe(false)
    await expect(verifyPlayback({ expires, now: NOW, secret: SECRET, signature: changed, videoId: VIDEO_ID })).resolves.toBe(false)
  })
})
