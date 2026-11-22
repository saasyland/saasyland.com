import { env } from "cloudflare:workers"

import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { createEdgeCache } from "~/src/platform/testing/mocks/cache"
import { flushWaitUntil } from "~/src/platform/testing/mocks/cloudflare"

import { coverVariantKey } from "~/src/modules/course/course.cover"
import { serveCover } from "~/src/modules/course/course.delivery"

const ORIGIN = "https://saasyland.test"
const COVER = "covers/0195a2b4-6c8d-7e9f-8a0b-00000000c0c0/0195a2b4-6c8d-7e9f-8a0b-00000000c0e1.webp"
const SMALL = coverVariantKey(COVER, 480)
const BYTES = "RIFF-cover"

const request = (key: string, init?: RequestInit): Promise<Response> => serveCover(new Request(`${ORIGIN}/media/${key}`, init))

let edge = createEdgeCache()

beforeEach(async () => {
  edge = createEdgeCache()
  await env.MEDIA.put(COVER, BYTES)
  await env.MEDIA.put(SMALL, BYTES)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("serveCover", () => {
  it("serves each size of a cover with its type and a public, immutable cache policy", async () => {
    for (const key of [COVER, SMALL]) {
      const response = await request(key)

      expect(response.status).toBe(200)
      expect(await response.text()).toBe(BYTES)
      expect(Object.fromEntries(response.headers)).toMatchObject({
        "cache-control": "public, max-age=31536000, immutable",
        "content-length": String(BYTES.length),
        "content-type": "image/webp",
      })
    }
  })

  it("keeps a copy at the edge and serves repeats from it without reading R2", async () => {
    await request(COVER)
    await flushWaitUntil()
    expect(edge.entries.has(`${ORIGIN}/media/${COVER}`)).toBe(true)

    const get = vi.spyOn(env.MEDIA, "get")
    const repeat = await request(COVER)

    expect(await repeat.text()).toBe(BYTES)
    expect(get).not.toHaveBeenCalled()
  })

  it("answers HEAD with the headers alone", async () => {
    const response = await request(COVER, { method: "HEAD" })

    expect(response.status).toBe(200)
    expect(response.headers.get("content-length")).toBe(String(BYTES.length))
    expect(await response.text()).toBe("")
  })

  it.each(["GET", "HEAD"])("reports a cover that is not stored as not found on %s", async (method) => {
    const response = await request(COVER.replace("c0e1", "c0e2"), { method })

    expect(response.status).toBe(404)
  })

  it.each([
    "covers/0195a2b4-6c8d-7e9f-8a0b-00000000c0c0/0195a2b4-6c8d-7e9f-8a0b-00000000c0e1.gif",
    "covers/0195a2b4-6c8d-7e9f-8a0b-00000000c0c0/notes.webp",
    "covers/0195a2b4-6c8d-7e9f-8a0b-00000000c0c0/0195a2b4-6c8d-7e9f-8a0b-00000000c0e1/../x.webp",
  ])("refuses a path that is no cover: %s", async (key) => {
    const get = vi.spyOn(env.MEDIA, "get")

    const response = await request(key)

    expect(response.status).toBe(404)
    expect(get).not.toHaveBeenCalled()
  })

  it("allows only GET and HEAD", async () => {
    const response = await request(COVER, { method: "POST" })

    expect(response.status).toBe(405)
    expect(response.headers.get("allow")).toBe("GET, HEAD")
  })
})
