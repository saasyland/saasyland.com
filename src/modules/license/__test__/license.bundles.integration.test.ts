import { env } from "cloudflare:workers"

import { DEPLOYMENT, STACK_DEFAULTS } from "@saasyland/stack"
import { API_ENDPOINT, API_ERROR, API_HEADER, API_LIMIT, API_ROUTE, HTTP_METHOD, RATE_LIMIT, ROUTE_PARAMETER } from "@saasyland/stack/api"
import { gzipSync } from "node:zlib"
import { afterEach, assert, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { TEST_APP_URL } from "~/src/platform/testing/lib/test-request"
import { refundPolarOrder, revokePolarLicenseKey } from "~/src/platform/testing/mocks/polar"

import { HTTP_STATUS, IP_ADDRESS_HEADER } from "~/src/modules/_core/constants/api"
import {
  BUNDLE_REQUEST,
  CI,
  CI_ACTIVATION,
  CLI_VERSION,
  LAPTOP,
  LAPTOP_ACTIVATION,
  NOW,
  RECORD_OUTAGE,
  STUDIO,
  activated,
  buy,
  consoleErrors,
  deactivate,
  exchange,
  expectFailureLogged,
  expectInvalid,
  expectServiceUnavailable,
  licenseRecords,
  rawRequest,
  refuseRecordWrites,
  requestBundle,
  signedHeaders,
  watchLicenseUpdates,
} from "~/src/modules/license/__test__/fixtures/license-api"
import { licenseApiHandlers } from "~/src/modules/license/license.api"
import { bundleObjectKey } from "~/src/modules/license/license.bundles"
import { BUNDLE_METADATA, BUNDLE_PATH_PREFIX, LICENSE_STATUS } from "~/src/modules/license/license.constants"
import { serveBundle } from "~/src/modules/license/license.delivery"
import { license } from "~/src/modules/license/license.schema"
import { licenseWebhookHandlers } from "~/src/modules/license/license.webhooks"

import { MILLISECONDS_PER_SECOND } from "~/src/lib/duration"
import { sha256Hex } from "~/src/lib/hex"

const UNRELEASED_VERSION = "9.9.9"
const ARCHIVE_CONTENT = JSON.stringify({ layers: [], schemaVersion: 1, version: CLI_VERSION })
const ARCHIVE = gzipSync(ARCHIVE_CONTENT)
const ARCHIVE_DIGEST = await sha256Hex(ARCHIVE_CONTENT)
const DESCRIBED = { customMetadata: { [BUNDLE_METADATA.SHA256]: ARCHIVE_DIGEST } }
const KEY_LIMIT_ADDRESSES = 3
const APP_HOST = new URL(TEST_APP_URL).host
const R2_OUTAGE = "We encountered an internal error. Please try again."
const UNDESCRIBED = `${bundleObjectKey(CLI_VERSION)} has no ${BUNDLE_METADATA.SHA256} digest in its custom metadata`
const LATER = new Date(NOW.getTime() + MILLISECONDS_PER_SECOND)

const bundleRoute = (activationId: string): string =>
  API_ROUTE.ACTIVATION_BUNDLES.replace(`:${ROUTE_PARAMETER.ACTIVATION_ID}`, activationId)

const studioBundle = async () => {
  const buyer = await buy()
  const activationId = await activated({ key: buyer.key, machine: STUDIO })
  return { ...buyer, activationId }
}

beforeEach(async () => {
  vi.useFakeTimers({ now: NOW, toFake: ["Date"] })
  await env.BUNDLES.put(bundleObjectKey(CLI_VERSION), ARCHIVE, DESCRIBED)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe("POST /activations/:activationId/bundles", () => {
  it("signs a URL to the release's archive with the digest of its content from the object's metadata, its size and when the URL expires, without reading the archive", async () => {
    const { activationId, key } = await studioBundle()
    const reads = vi.spyOn(env.BUNDLES, "get")

    const { result } = await requestBundle({ key, machine: STUDIO }, activationId)

    assert(result.success)
    const { url, ...described } = result.data
    expect(result.status).toBe(HTTP_STATUS.OK)
    expect(described).toStrictEqual({
      expiresAt: new Date(NOW.getTime() + API_LIMIT.BUNDLE_URL_TTL_SECONDS * MILLISECONDS_PER_SECOND).toISOString(),
      sha256: ARCHIVE_DIGEST,
      size: ARCHIVE.byteLength,
    })
    expect(reads).not.toHaveBeenCalled()
    expect(new URL(url)).toMatchObject({ host: APP_HOST, protocol: "https:" })
    expect(new URL(url).pathname.startsWith(`${BUNDLE_PATH_PREFIX}/`)).toBe(true)
  })

  it("serves exactly the bytes it described at the signed URL", async () => {
    const { activationId, key } = await studioBundle()
    const { result } = await requestBundle({ key, machine: STUDIO }, activationId)
    assert(result.success)

    const download = await serveBundle(new Request(result.data.url))
    const bytes = new Uint8Array(await download.arrayBuffer())

    expect(download.status).toBe(HTTP_STATUS.OK)
    expect(bytes.byteLength).toBe(result.data.size)
    expect(bytes).toStrictEqual(new Uint8Array(ARCHIVE))
  })

  it("stops serving the signed URL once it expires", async () => {
    const { activationId, key } = await studioBundle()
    const { result } = await requestBundle({ key, machine: STUDIO }, activationId)
    assert(result.success)

    vi.setSystemTime(Date.parse(result.data.expiresAt))
    const download = await serveBundle(new Request(result.data.url))

    expect(download.status).toBe(HTTP_STATUS.FORBIDDEN)
  })

  it("answers versionNotFound with the version when the release has no bundle", async () => {
    const { activationId, key } = await studioBundle()

    const { result } = await requestBundle({ key, machine: STUDIO }, activationId, { ...BUNDLE_REQUEST, version: UNRELEASED_VERSION })

    expect(result).toStrictEqual({ failure: { code: API_ERROR.VERSION_NOT_FOUND, version: UNRELEASED_VERSION }, success: false })
  })

  it("answers activationNotFound for an unknown activation, another machine's activation and a released one, without reading the bucket", async () => {
    const buyer = await buy()
    const studio = await activated({ key: buyer.key, machine: STUDIO })
    const laptop = await activated({ key: buyer.key, machine: LAPTOP }, LAPTOP_ACTIVATION)
    await activated({ key: buyer.key, machine: CI }, CI_ACTIVATION)
    await deactivate({ key: buyer.key, machine: STUDIO }, laptop)
    const reads = vi.spyOn(env.BUNDLES, "head")

    const results = await Promise.all([
      requestBundle({ key: buyer.key, machine: STUDIO }, crypto.randomUUID()),
      requestBundle({ key: buyer.key, machine: CI }, studio),
      requestBundle({ key: buyer.key, machine: LAPTOP }, laptop),
    ])

    expect(results.map(({ result }) => result)).toStrictEqual(
      Array.from({ length: 3 }, () => ({ failure: { code: API_ERROR.ACTIVATION_NOT_FOUND }, success: false })),
    )
    expect(reads).not.toHaveBeenCalled()
  })

  it.each([
    {
      code: API_ERROR.LICENSE_REFUNDED,
      end: async ({ grant, order }: Awaited<ReturnType<typeof buy>>) => {
        await licenseWebhookHandlers.onOrderRefunded({ data: refundPolarOrder(order.id, order.net_amount) })
        await licenseWebhookHandlers.onBenefitGrantRevoked({ data: revokePolarLicenseKey(grant) })
      },
      state: LICENSE_STATUS.REFUNDED,
    },
    {
      code: API_ERROR.LICENSE_REVOKED,
      end: async ({ grant }: Awaited<ReturnType<typeof buy>>) => {
        await licenseWebhookHandlers.onBenefitGrantRevoked({ data: revokePolarLicenseKey(grant) })
      },
      state: LICENSE_STATUS.REVOKED,
    },
  ])("answers $code once the licence of an activated machine is $state", async ({ code, end }) => {
    const buyer = await studioBundle()
    await end(buyer)

    const { result } = await requestBundle({ key: buyer.key, machine: STUDIO }, buyer.activationId)

    expect(result).toStrictEqual({ failure: { code }, success: false })
  })
})

describe("the record of the first template download", () => {
  it("records the first download before it hands out the signed URL", async () => {
    const { activationId, key } = await studioBundle()

    const { result } = await requestBundle({ key, machine: STUDIO }, activationId)

    expect(result.success).toBe(true)
    expect(await licenseRecords(key)).toStrictEqual({ activatedAt: NOW, deliveredAt: NOW })
  })

  it("records the first download in one update", async () => {
    const { activationId, key } = await studioBundle()
    const updates = watchLicenseUpdates()

    await requestBundle({ key, machine: STUDIO }, activationId)

    expect(updates()).toHaveLength(1)
  })

  it("answers a later download with one round trip to D1 and writes nothing to the licence", async () => {
    const { activationId, key } = await studioBundle()
    await requestBundle({ key, machine: STUDIO }, activationId)
    const updates = watchLicenseUpdates()
    const batches = vi.spyOn(env.DB, "batch")

    const { result } = await requestBundle({ key, machine: STUDIO }, activationId)

    expect(result.success).toBe(true)
    expect(updates()).toStrictEqual([])
    expect(batches).toHaveBeenCalledOnce()
  })

  it("never overwrites the first download when the CLI downloads templates again", async () => {
    const { activationId, key } = await studioBundle()
    await requestBundle({ key, machine: STUDIO }, activationId)
    vi.setSystemTime(LATER)

    const { result } = await requestBundle({ key, machine: STUDIO }, activationId)

    expect(result.success).toBe(true)
    expect(await licenseRecords(key)).toStrictEqual({ activatedAt: NOW, deliveredAt: NOW })
  })

  it("records nothing when it refuses the bundle", async () => {
    const { activationId, key } = await studioBundle()

    const results = await Promise.all([
      requestBundle({ key, machine: STUDIO }, activationId, { ...BUNDLE_REQUEST, version: UNRELEASED_VERSION }),
      requestBundle({ key, machine: STUDIO }, crypto.randomUUID()),
      requestBundle({ key, machine: LAPTOP }, activationId),
    ])

    expect(results.map(({ result }) => result.success)).toStrictEqual([false, false, false])
    expect(await licenseRecords(key)).toStrictEqual({ activatedAt: NOW, deliveredAt: null })
  })

  it("does not hand out the bundle when it cannot record the download, and logs the failure", async () => {
    const { activationId, key } = await studioBundle()
    const errors = consoleErrors()
    await refuseRecordWrites(license.deliveredAt)

    expectServiceUnavailable(await requestBundle({ key, machine: STUDIO }, activationId))
    expectFailureLogged(errors, API_ENDPOINT.BUNDLE, RECORD_OUTAGE)
    expect(await licenseRecords(key)).toStrictEqual({ activatedAt: NOW, deliveredAt: null })
  })
})

describe("bundle storage", () => {
  it("answers serviceUnavailable with retry-after when the bucket cannot be read, and logs the failure", async () => {
    const { activationId, key } = await studioBundle()
    const errors = consoleErrors()
    vi.spyOn(env.BUNDLES, "head").mockRejectedValueOnce(new Error(R2_OUTAGE))

    expectServiceUnavailable(await requestBundle({ key, machine: STUDIO }, activationId))
    expectFailureLogged(errors, API_ENDPOINT.BUNDLE, R2_OUTAGE)
  })

  it.each([
    { customMetadata: {}, state: "no digest" },
    { customMetadata: { [BUNDLE_METADATA.SHA256]: ARCHIVE_CONTENT }, state: "a value that is not a SHA-256" },
  ])(
    "answers serviceUnavailable instead of a digest when the stored object's metadata holds $state, logs the failure and records no download",
    async ({ customMetadata }) => {
      const { activationId, key } = await studioBundle()
      const errors = consoleErrors()
      await env.BUNDLES.put(bundleObjectKey(CLI_VERSION), ARCHIVE, { customMetadata })

      expectServiceUnavailable(await requestBundle({ key, machine: STUDIO }, activationId))
      expectFailureLogged(errors, API_ENDPOINT.BUNDLE, UNDESCRIBED)
      expect(await licenseRecords(key)).toStrictEqual({ activatedAt: NOW, deliveredAt: null })
    },
  )
})

describe("invalid bundle requests", () => {
  it("names the answer the stack's rules refuse and a version that is not a release, without reading the bucket", async () => {
    const { activationId, key } = await studioBundle()
    const reads = vi.spyOn(env.BUNDLES, "head")
    const request = rawRequest(bundleRoute(activationId), {
      body: JSON.stringify({ answers: { ...STACK_DEFAULTS, deployment: DEPLOYMENT.VERCEL }, version: "latest" }),
      headers: signedHeaders(key, STUDIO),
      method: HTTP_METHOD.POST,
    })

    const { result } = await exchange(API_ENDPOINT.BUNDLE, licenseApiHandlers.bundle, request)

    expectInvalid(result, "body.answers.database", "body.version")
    expect(reads).not.toHaveBeenCalled()
  })
})

describe("bundle rate limits", () => {
  it("answers rateLimited to an address once it has sent the limit in one period, before reading the key", async () => {
    const { activationId, key } = await studioBundle()
    for (let request = 0; request < RATE_LIMIT.REQUESTS_PER_ADDRESS; request++) {
      await licenseApiHandlers.bundle({
        params: { activationId },
        request: rawRequest(bundleRoute(activationId), { headers: { [IP_ADDRESS_HEADER]: "203.0.113.30" }, method: HTTP_METHOD.POST }),
      })
    }

    const { headers, result } = await requestBundle({ address: "203.0.113.30", key, machine: STUDIO }, activationId)

    expect(result).toStrictEqual({
      failure: { code: API_ERROR.RATE_LIMITED, retryAfterSeconds: RATE_LIMIT.PERIOD_SECONDS },
      success: false,
    })
    expect(headers.get(API_HEADER.RETRY_AFTER)).toBe(String(RATE_LIMIT.PERIOD_SECONDS))
  })

  it("answers rateLimited to every address once the key has sent its limit in one period", async () => {
    const { activationId, key } = await studioBundle()
    for (let request = 0; request < RATE_LIMIT.REQUESTS_PER_LICENSE_KEY; request++) {
      await requestBundle({ address: `198.51.100.${String(request % KEY_LIMIT_ADDRESSES)}`, key, machine: STUDIO }, crypto.randomUUID())
    }

    const { result } = await requestBundle({ address: "192.0.2.40", key, machine: STUDIO }, activationId)

    expect(result).toStrictEqual({
      failure: { code: API_ERROR.RATE_LIMITED, retryAfterSeconds: RATE_LIMIT.PERIOD_SECONDS },
      success: false,
    })
  })
})
