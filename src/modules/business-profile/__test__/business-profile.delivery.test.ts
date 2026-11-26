import { env } from "cloudflare:workers"

import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { createEdgeCache } from "~/src/platform/testing/mocks/cache"
import { flushWaitUntil } from "~/src/platform/testing/mocks/cloudflare"

import { serveBusinessLogo } from "~/src/modules/business-profile/business-profile.delivery"

const ORIGIN = "https://saasyland.test"
const LOGO = "logos/0195a2b4-6c8d-7e9f-8a0b-00000000b0b0.png"
const BYTES = "PNG-logo"

const request = (key: string, init?: RequestInit): Promise<Response> => serveBusinessLogo(new Request(`${ORIGIN}/media/${key}`, init))

let edge = createEdgeCache()

beforeEach(async () => {
  edge = createEdgeCache()
  await env.MEDIA.put(LOGO, BYTES)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("serveBusinessLogo", () => {
  it("serves the logo with its type and a public, immutable cache policy", async () => {
    const response = await request(LOGO)

    expect(response.status).toBe(200)
    expect(await response.text()).toBe(BYTES)
    expect(Object.fromEntries(response.headers)).toMatchObject({
      "cache-control": "public, max-age=31536000, immutable",
      "content-length": String(BYTES.length),
      "content-type": "image/png",
    })
  })

  it("keeps a copy at the edge and serves repeats from it without reading R2", async () => {
    await request(LOGO)
    await flushWaitUntil()
    expect(edge.entries.has(`${ORIGIN}/media/${LOGO}`)).toBe(true)

    const get = vi.spyOn(env.MEDIA, "get")
    const repeat = await request(LOGO)

    expect(await repeat.text()).toBe(BYTES)
    expect(get).not.toHaveBeenCalled()
  })

  it("answers HEAD with the headers alone", async () => {
    const response = await request(LOGO, { method: "HEAD" })

    expect(response.status).toBe(200)
    expect(response.headers.get("content-length")).toBe(String(BYTES.length))
    expect(await response.text()).toBe("")
  })

  it.each(["GET", "HEAD"])("reports a logo that is not stored as not found on %s", async (method) => {
    const response = await request(LOGO.replace("b0b0", "b0b1"), { method })

    expect(response.status).toBe(404)
  })

  it.each(["logos/0195a2b4-6c8d-7e9f-8a0b-00000000b0b0.gif", "logos/notes.png", "logos/nested/0195a2b4-6c8d-7e9f-8a0b-00000000b0b0.png"])(
    "refuses a path that is no logo: %s",
    async (key) => {
      const get = vi.spyOn(env.MEDIA, "get")

      const response = await request(key)

      expect(response.status).toBe(404)
      expect(get).not.toHaveBeenCalled()
    },
  )

  it("allows only GET and HEAD", async () => {
    const response = await request(LOGO, { method: "POST" })

    expect(response.status).toBe(405)
    expect(response.headers.get("allow")).toBe("GET, HEAD")
  })
})
