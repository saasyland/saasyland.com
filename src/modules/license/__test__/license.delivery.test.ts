import { env } from "cloudflare:workers"

import { API_LIMIT, HTTP_METHOD } from "@saasyland/stack/api"
import { gzipSync } from "node:zlib"
import { afterEach, assert, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"
import { SIGNED_BUNDLE_PATH, bundleObjectKey, signBundle } from "~/src/modules/license/license.bundles"
import { BUNDLE_ARCHIVE_EXTENSION, BUNDLE_CONTENT_TYPE, BUNDLE_PATH_PREFIX } from "~/src/modules/license/license.constants"
import { serveBundle } from "~/src/modules/license/license.delivery"

import { MILLISECONDS_PER_SECOND } from "~/src/lib/duration"

const HOST = "saasyland.test"
const VERSION = "0.1.0"
const OTHER_VERSION = "0.2.0"
const NOW = new Date("2026-11-15T10:00:00.000Z")
const ARCHIVE = gzipSync(JSON.stringify({ schemaVersion: 1, version: VERSION }))

const signedUrl = async (version = VERSION): Promise<string> => {
  const { url } = await signBundle({ host: HOST, now: Date.now(), secret: env.AUTH_SECRET, version })
  return url
}

const download = async (init?: RequestInit, version = VERSION): Promise<Response> =>
  serveBundle(new Request(await signedUrl(version), init))

beforeEach(async () => {
  vi.useFakeTimers({ now: NOW, toFake: ["Date"] })
  await env.BUNDLES.put(bundleObjectKey(VERSION), ARCHIVE)
})

afterEach(() => {
  vi.useRealTimers()
})

describe("serveBundle", () => {
  it("streams the signed release's archive as gzip that no cache keeps", async () => {
    const response = await download()

    expect(response.status).toBe(HTTP_STATUS.OK)
    expect(new Uint8Array(await response.arrayBuffer())).toStrictEqual(new Uint8Array(ARCHIVE))
    expect(Object.fromEntries(response.headers)).toMatchObject({
      "cache-control": "private, no-store",
      "content-length": String(ARCHIVE.byteLength),
      "content-type": BUNDLE_CONTENT_TYPE,
    })
    expect(response.headers.get("etag")).not.toBeNull()
  })

  it("answers HEAD with the archive's headers and no body", async () => {
    const get = vi.spyOn(env.BUNDLES, "get")

    const response = await download({ method: "HEAD" })

    expect(response.status).toBe(HTTP_STATUS.OK)
    expect(response.headers.get("content-length")).toBe(String(ARCHIVE.byteLength))
    expect(await response.text()).toBe("")
    expect(get).not.toHaveBeenCalled()
  })

  it("serves the URL until it expires and refuses it from then on", async () => {
    const url = await signedUrl()
    const expiresAt = NOW.getTime() + API_LIMIT.BUNDLE_URL_TTL_SECONDS * MILLISECONDS_PER_SECOND

    vi.setSystemTime(expiresAt - 1)
    const lastMoment = await serveBundle(new Request(url))
    vi.setSystemTime(expiresAt)
    const expired = await serveBundle(new Request(url))

    expect(lastMoment.status).toBe(HTTP_STATUS.OK)
    expect(expired.status).toBe(HTTP_STATUS.FORBIDDEN)
  })

  it("refuses a URL whose signature was changed or signed for another release", async () => {
    const url = new URL(await signedUrl())
    const groups = SIGNED_BUNDLE_PATH.exec(url)?.pathname.groups
    assert(groups?.["expiry"] !== undefined && groups["signature"] !== undefined)
    const { expiry, signature } = groups
    const changed = `${signature.slice(0, -1)}${signature.endsWith("0") ? "1" : "0"}`
    await env.BUNDLES.put(bundleObjectKey(OTHER_VERSION), ARCHIVE)

    const responses = await Promise.all(
      [
        `${BUNDLE_PATH_PREFIX}/${expiry}.${changed}/${bundleObjectKey(VERSION)}`,
        `${BUNDLE_PATH_PREFIX}/${expiry}.${signature}/${bundleObjectKey(OTHER_VERSION)}`,
      ].map((pathname) => serveBundle(new Request(new URL(pathname, url)))),
    )

    expect(responses.map(({ status }) => status)).toStrictEqual([HTTP_STATUS.FORBIDDEN, HTTP_STATUS.FORBIDDEN])
  })

  it.each([
    ["no signature", `${BUNDLE_PATH_PREFIX}/${VERSION}${BUNDLE_ARCHIVE_EXTENSION}`],
    ["a version that is not a release", `${BUNDLE_PATH_PREFIX}/mabc12.${"0".repeat(64)}/latest${BUNDLE_ARCHIVE_EXTENSION}`],
    ["another file", `${BUNDLE_PATH_PREFIX}/mabc12.${"0".repeat(64)}/${VERSION}.zip`],
  ])("answers a path with %s with 404", async (_case, pathname) => {
    const response = await serveBundle(new Request(new URL(pathname, `https://${HOST}`)))

    expect(response.status).toBe(HTTP_STATUS.NOT_FOUND)
  })

  it("answers 404 when the signed release has no archive in the bucket", async () => {
    await env.BUNDLES.delete(bundleObjectKey(VERSION))

    const responses = await Promise.all([download(), download({ method: "HEAD" })])

    expect(responses.map(({ status }) => status)).toStrictEqual([HTTP_STATUS.NOT_FOUND, HTTP_STATUS.NOT_FOUND])
  })

  it("allows only GET and HEAD", async () => {
    const response = await download({ method: HTTP_METHOD.POST })

    expect(response.status).toBe(HTTP_STATUS.METHOD_NOT_ALLOWED)
    expect(response.headers.get("allow")).toBe("GET, HEAD")
  })
})
