import { env } from "cloudflare:workers"

import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { createEdgeCache } from "~/src/platform/testing/mocks/cache"
import { flushWaitUntil } from "~/src/platform/testing/mocks/cloudflare"

import { serveMedia } from "~/src/modules/video/video.delivery"
import { videoObjectKey } from "~/src/modules/video/video.files"
import { createPlayback } from "~/src/modules/video/video.playback"

const VIDEO_ID = "0195a2b4-6c8d-7e9f-8a0b-1c2d3e4f5a6b"
const SEGMENT = "720p/seg-00000.m4s"
const SEGMENT_BYTES = "0123456789"
const PLAYLIST = "#EXTM3U\n"
const ORIGIN = "https://saasyland.test"

const signedUrl = async (file: string, now = Date.now()): Promise<string> => {
  const { src } = await createPlayback({ now, secret: env.AUTH_SECRET, video: { captionLocales: [], id: VIDEO_ID } })
  return `${ORIGIN}${src.replace("master.m3u8", file)}`
}

const request = async (file: string, init?: RequestInit): Promise<Response> => serveMedia(new Request(await signedUrl(file), init))

let edge = createEdgeCache()

beforeEach(async () => {
  edge = createEdgeCache()
  await env.MEDIA.put(videoObjectKey({ file: SEGMENT, videoId: VIDEO_ID }), SEGMENT_BYTES)
  await env.MEDIA.put(videoObjectKey({ file: "master.m3u8", videoId: VIDEO_ID }), PLAYLIST)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("serveMedia", () => {
  it("streams a signed file with its media type and a private, immutable cache policy", async () => {
    const response = await request("master.m3u8")

    expect(response.status).toBe(200)
    expect(await response.text()).toBe(PLAYLIST)
    expect(Object.fromEntries(response.headers)).toMatchObject({
      "accept-ranges": "bytes",
      "cache-control": "private, max-age=86400, immutable",
      "content-length": String(PLAYLIST.length),
      "content-type": "application/vnd.apple.mpegurl",
    })
  })

  it("keeps a public copy at the edge under a key without the token and serves repeats from it", async () => {
    await request(SEGMENT)
    await flushWaitUntil()
    const stored = edge.entries.get(`${ORIGIN}/media/_/${VIDEO_ID}/${SEGMENT}`)

    expect(stored?.headers.get("cache-control")).toBe("public, max-age=31536000, immutable")

    const get = vi.spyOn(env.MEDIA, "get")
    const repeat = await request(SEGMENT)

    expect(await repeat.text()).toBe(SEGMENT_BYTES)
    expect(repeat.headers.get("cache-control")).toBe("private, max-age=86400, immutable")
    expect(repeat.headers.get("content-type")).toBe("video/iso.segment")
    expect(get).not.toHaveBeenCalled()
  })

  it.each([
    { contentRange: "bytes 2-5/10", header: "bytes=2-5", length: "4", text: "2345" },
    { contentRange: "bytes 7-9/10", header: "bytes=7-", length: "3", text: "789" },
    { contentRange: "bytes 6-9/10", header: "bytes=-4", length: "4", text: "6789" },
    { contentRange: "bytes 0-9/10", header: "bytes=-40", length: "10", text: SEGMENT_BYTES },
    { contentRange: "bytes 8-9/10", header: "bytes=8-99", length: "2", text: "89" },
  ])("answers Range $header with 206 and $contentRange", async ({ contentRange, header, length, text }) => {
    const response = await request(SEGMENT, { headers: { Range: header } })

    expect(response.status).toBe(206)
    expect(await response.text()).toBe(text)
    expect(response.headers.get("content-range")).toBe(contentRange)
    expect(response.headers.get("content-length")).toBe(length)
    expect(edge.cache.match).not.toHaveBeenCalled()
  })

  it.each(["bytes=10-", "bytes=5-2", "bytes=-", "items=0-1"])("refuses the unsatisfiable range %s with 416", async (header) => {
    const response = await request(SEGMENT, { headers: { Range: header } })

    expect(response.status).toBe(416)
    expect(response.headers.get("content-range")).toBe("bytes */10")
  })

  it("answers HEAD with the headers and no body", async () => {
    const response = await request(SEGMENT, { method: "HEAD" })

    expect(response.status).toBe(200)
    expect(response.headers.get("content-length")).toBe(String(SEGMENT_BYTES.length))
    expect(response.body).toBeNull()
  })

  it.each([
    { init: {}, name: "GET" },
    { init: { method: "HEAD" }, name: "HEAD" },
    { init: { headers: { Range: "bytes=0-1" } }, name: "a range" },
  ])("returns 404 for $name of a file that was never uploaded", async ({ init }) => {
    const response = await request("1080p/seg-00000.m4s", init)

    expect(response.status).toBe(404)
  })

  it("returns 404 when the object disappears between the size check and the read", async () => {
    vi.spyOn(env.MEDIA, "get").mockResolvedValueOnce(null)
    const response = await request(SEGMENT, { headers: { Range: "bytes=0-1" } })

    expect(response.status).toBe(404)
  })

  it("rejects an expired link and a link for another video", async () => {
    const expiredUrl = await signedUrl(SEGMENT, Date.now() - 86_400_000)
    const currentUrl = await signedUrl(SEGMENT)
    const expired = await serveMedia(new Request(expiredUrl))
    const otherVideo = await serveMedia(new Request(currentUrl.replace(VIDEO_ID, "0195a2b4-6c8d-7e9f-8a0b-000000000000")))

    expect(expired.status).toBe(403)
    expect(otherVideo.status).toBe(403)
  })

  it.each(["../../secrets.txt", "source.mp4", "720p/seg-1.ts"])("returns 404 for the unlisted path %s", async (file) => {
    const response = await request(file)

    expect(response.status).toBe(404)
  })

  it("returns 404 for a path without a token", async () => {
    const response = await serveMedia(new Request(`${ORIGIN}/media/${VIDEO_ID}/master.m3u8`))

    expect(response.status).toBe(404)
  })

  it("allows only reads", async () => {
    const response = await request(SEGMENT, { method: "PUT" })

    expect(response.status).toBe(405)
    expect(response.headers.get("allow")).toBe("GET, HEAD")
  })
})
