import { env } from "cloudflare:workers"

import type { models } from "@polar-sh/sdk/2026-10"
import {
  ACTIVATION_KIND,
  API_ENDPOINT,
  API_ERROR,
  API_HEADER,
  API_LIMIT,
  API_ROUTE,
  AUTHORIZATION_SCHEME,
  type Api,
  HTTP_METHOD,
  PLATFORM,
  RATE_LIMIT,
  ROUTE_PARAMETER,
  deriveMachineId,
} from "@saasyland/stack/api"
import { eq, getTableName, sql } from "drizzle-orm"
import { afterEach, assert, describe, expect, it, onTestFinished, vi } from "vite-plus/test"

import {
  activatePolarLicenseKey,
  polarActivationConditions,
  polarLicenseKeyOf,
  refundPolarOrder,
  revokePolarLicenseKey,
} from "~/src/platform/testing/mocks/polar"
import { fetchFromProviders } from "~/src/platform/testing/mocks/providers"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { HTTP_STATUS, IP_ADDRESS_HEADER } from "~/src/modules/_core/constants/api"
import {
  ADDRESS,
  type Buyer,
  CI,
  CI_ACTIVATION,
  ENDPOINT_CALLS,
  LAPTOP,
  LAPTOP_ACTIVATION,
  NEWER_CLI_VERSION,
  NOW,
  OTHER_ADDRESS,
  RECORD_OUTAGE,
  STUDIO,
  STUDIO_ACTIVATION,
  UNKNOWN_KEY,
  activate,
  activated,
  buy,
  consoleErrors,
  deactivate,
  exchange,
  expectFailureLogged,
  expectInvalid,
  expectKeyNotLogged,
  expectServiceUnavailable,
  getLicense,
  licenseRecords,
  rawRequest,
  refuseRecordWrites,
  signedHeaders,
  summary,
  validate,
  watchLicenseUpdates,
} from "~/src/modules/license/__test__/fixtures/license-api"
import { licenseApiHandlers } from "~/src/modules/license/license.api"
import { LICENSE_ACTIVATION_LIMITS, LICENSE_TIER, LICENSE_TIERS } from "~/src/modules/license/license.constants"
import { license } from "~/src/modules/license/license.schema"
import { licenseWebhookHandlers } from "~/src/modules/license/license.webhooks"

import { MILLISECONDS_PER_SECOND } from "~/src/lib/duration"

const KEY_LIMIT_ADDRESSES = 3
const REFUSED_BY_ADDRESS = 10
const LATER = new Date(NOW.getTime() + MILLISECONDS_PER_SECOND)

const keyLimitAddress = (request: number): string => `198.51.100.${String(request % KEY_LIMIT_ADDRESSES)}`

const activationFrom = (key: string, address: string): Request =>
  rawRequest(API_ROUTE.ACTIVATIONS, {
    body: JSON.stringify(STUDIO_ACTIVATION.body),
    headers: { ...signedHeaders(key, STUDIO), [IP_ADDRESS_HEADER]: address },
    method: HTTP_METHOD.POST,
  })

const EXHAUSTED_LIMITS = [
  { limit: "address", refusedFrom: ADDRESS, requests: RATE_LIMIT.REQUESTS_PER_ADDRESS, sentFrom: (): string => ADDRESS },
  { limit: "licence key", refusedFrom: OTHER_ADDRESS, requests: RATE_LIMIT.REQUESTS_PER_LICENSE_KEY, sentFrom: keyLimitAddress },
]

const otherMachine = (
  details: Api["activateRequest"]["body"],
  { created_at: createdAt, id }: models.LicenseKeyActivationBase,
): Api["machine"] => ({
  ...details,
  createdAt,
  current: false,
  id,
})

const polarMachines = ({ grant }: Buyer, details: Api["activateRequest"]["body"]): Api["machine"][] =>
  polarLicenseKeyOf(grant).activations.map((activation) => otherMachine(details, activation))

const failingPolar = (method: string, answer: (request: Request) => Promise<Response>): void => {
  vi.stubGlobal("fetch", (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    const request = new Request(input, init)
    return request.method === method ? answer(request) : fetchFromProviders(request)
  })
}

const echoAsInvalid = async (request: Request): Promise<Response> =>
  Response.json(
    { detail: [{ input: await request.text(), loc: ["body"], msg: "Invalid request", type: "value_error" }] },
    { status: HTTP_STATUS.UNPROCESSABLE_CONTENT },
  )

const POLAR_FAILURES = [
  { answer: (): Promise<Response> => Promise.reject(new TypeError("fetch failed")), failure: "cannot be reached", reason: "fetch failed" },
  {
    answer: (): Promise<Response> => Promise.resolve(new Response("upstream failed", { status: HTTP_STATUS.INTERNAL_SERVER_ERROR })),
    failure: "fails with a server error",
    reason: "upstream failed",
  },
  {
    answer: (): Promise<Response> => Promise.resolve(Response.json({ detail: "Rate limited" }, { status: HTTP_STATUS.TOO_MANY_REQUESTS })),
    failure: "throttles the organisation",
    reason: "Rate limit exceeded",
  },
  {
    answer: (): Promise<Response> => Promise.resolve(Response.json({ detail: "Refused" }, { status: HTTP_STATUS.UNAUTHORIZED })),
    failure: "rejects the access token",
    reason: "Refused",
  },
  { answer: echoAsInvalid, failure: "refuses the request as invalid and echoes it", reason: "Invalid request" },
]

const D1_OUTAGE = "D1_ERROR: Network connection lost."
const OFFLINE_LICENSE_TABLE = "license_offline"
const MISSING_LICENSE_TABLE = `no such table: ${getTableName(license)}`

const takeLicenseTableOffline = async (): Promise<void> => {
  await db.run(sql`alter table ${license} rename to ${sql.identifier(OFFLINE_LICENSE_TABLE)}`)
  onTestFinished(async () => {
    await db.run(sql`alter table ${sql.identifier(OFFLINE_LICENSE_TABLE)} rename to ${license}`)
  })
}

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe("GET /license", () => {
  it("lists the key's machines, marks the calling one current and counts them against the tier's limit", async () => {
    const buyer = await buy(LICENSE_TIER.COMPLETE)
    const studio = await activated({ key: buyer.key, machine: STUDIO })
    const ci = await activated({ key: buyer.key, machine: CI }, CI_ACTIVATION)
    const portal = activatePolarLicenseKey(buyer.grant, "Activated in the Polar portal")
    const createdAt = (activationId: string) => polarLicenseKeyOf(buyer.grant).activations.find(({ id }) => id === activationId)?.created_at

    const { result } = await getLicense({ key: buyer.key, machine: STUDIO })

    expect(result).toStrictEqual({
      data: {
        license: summary(LICENSE_TIER.COMPLETE, 3),
        machines: [
          { ...STUDIO_ACTIVATION.body, createdAt: createdAt(studio), current: true, id: studio },
          { ...CI_ACTIVATION.body, createdAt: createdAt(ci), current: false, id: ci },
          { createdAt: portal.created_at, current: false, id: portal.id, label: portal.label },
        ],
      },
      status: HTTP_STATUS.OK,
      success: true,
    })
  })

  it.each(LICENSE_TIERS)("reports the %s tier with its activation limit", async (tier) => {
    const { key } = await buy(tier)

    const { result } = await getLicense({ key, machine: STUDIO })

    expect(result).toStrictEqual({ data: { license: summary(tier, 0), machines: [] }, status: HTTP_STATUS.OK, success: true })
  })
})

describe("POST /activations", () => {
  it("activates a new machine in Polar with its label, details and machine id, and takes one slot", async () => {
    const buyer = await buy()

    const { result } = await activate({ key: buyer.key, machine: STUDIO })

    const [activation] = polarLicenseKeyOf(buyer.grant).activations
    assert(activation)
    expect(result).toStrictEqual({
      data: { activationId: activation.id, license: summary(LICENSE_TIER.CORE, 1) },
      status: HTTP_STATUS.CREATED,
      success: true,
    })
    const { label, ...details } = STUDIO_ACTIVATION.body
    expect(activation.label).toBe(label)
    expect(activation.meta).toStrictEqual({ ...details, machine: STUDIO })
    expect(polarActivationConditions(activation.id)).toStrictEqual({ machine: STUDIO })
  })

  it("reuses the machine's own activation unchanged instead of taking another slot", async () => {
    const buyer = await buy()
    const activationId = await activated({ key: buyer.key, machine: STUDIO })
    const before = polarLicenseKeyOf(buyer.grant).activations

    const { result } = await activate(
      { key: buyer.key, machine: STUDIO },
      { body: { cliVersion: NEWER_CLI_VERSION, kind: ACTIVATION_KIND.MACHINE, label: "renamed-mac", platform: PLATFORM.LINUX } },
    )

    expect(result).toStrictEqual({ data: { activationId, license: summary(LICENSE_TIER.CORE, 1) }, status: HTTP_STATUS.OK, success: true })
    expect(polarLicenseKeyOf(buyer.grant).activations).toStrictEqual(before)
  })

  it("answers activationLimitReached with the licence and its machines once every slot is taken", async () => {
    const buyer = await buy()
    const limit = LICENSE_ACTIVATION_LIMITS[LICENSE_TIER.CORE]
    for (let slot = 0; slot < limit; slot++) {
      await activated({ key: buyer.key, machine: await deriveMachineId(ACTIVATION_KIND.MACHINE, [`machine-${String(slot)}`]) })
    }

    const { result } = await activate({ key: buyer.key, machine: LAPTOP }, LAPTOP_ACTIVATION)

    expect(result).toStrictEqual({
      failure: {
        code: API_ERROR.ACTIVATION_LIMIT_REACHED,
        license: summary(LICENSE_TIER.CORE, limit),
        machines: polarMachines(buyer, STUDIO_ACTIVATION.body),
      },
      success: false,
    })
    expect(polarLicenseKeyOf(buyer.grant).activations).toHaveLength(limit)
  })

  it("lets a machine that holds a slot activate again when every slot is taken", async () => {
    const buyer = await buy()
    const activationId = await activated({ key: buyer.key, machine: STUDIO })
    for (let slot = 1; slot < LICENSE_ACTIVATION_LIMITS[LICENSE_TIER.CORE]; slot++) {
      activatePolarLicenseKey(buyer.grant, `Portal machine ${String(slot)}`)
    }

    const { result } = await activate({ key: buyer.key, machine: STUDIO })

    expect(result).toMatchObject({ data: { activationId }, status: HTTP_STATUS.OK, success: true })
  })

  it("does not trust machine details it did not write", async () => {
    const buyer = await buy()
    const foreign = activatePolarLicenseKey(buyer.grant, "Copied details", { kind: "laptop", machine: STUDIO })

    const { result } = await activate({ key: buyer.key, machine: STUDIO })
    const listing = await getLicense({ key: buyer.key, machine: STUDIO })

    assert(result.success)
    expect(result.status).toBe(HTTP_STATUS.CREATED)
    expect(listing.result).toMatchObject({
      data: { machines: [{ createdAt: foreign.created_at, current: false, id: foreign.id, label: foreign.label }, { current: true }] },
    })
  })
})

describe("the record of the first activation", () => {
  it("records when Polar first activates a machine for the key, in one update", async () => {
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] })
    const { key } = await buy()
    const updates = watchLicenseUpdates()

    const { result } = await activate({ key, machine: STUDIO })

    expect(result).toMatchObject({ status: HTTP_STATUS.CREATED, success: true })
    expect(updates()).toHaveLength(1)
    expect(await licenseRecords(key)).toStrictEqual({ activatedAt: NOW, deliveredAt: null })
  })

  it("writes nothing to the licence once its first activation is recorded", async () => {
    const { key } = await buy()
    await activated({ key, machine: STUDIO })
    const updates = watchLicenseUpdates()

    const again = await activate({ key, machine: STUDIO })
    const another = await activate({ key, machine: LAPTOP }, LAPTOP_ACTIVATION)

    expect([again.result, another.result]).toMatchObject([
      { status: HTTP_STATUS.OK, success: true },
      { status: HTTP_STATUS.CREATED, success: true },
    ])
    expect(updates()).toStrictEqual([])
  })

  it("never overwrites the first activation when the key activates more machines later", async () => {
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] })
    const { key } = await buy()
    await activated({ key, machine: STUDIO })
    vi.setSystemTime(LATER)

    await activated({ key, machine: LAPTOP }, LAPTOP_ACTIVATION)
    await activated({ key, machine: STUDIO })

    expect(await licenseRecords(key)).toStrictEqual({ activatedAt: NOW, deliveredAt: null })
  })

  it("records an activation that a machine already held when none is recorded yet", async () => {
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] })
    const { key } = await buy()
    const activationId = await activated({ key, machine: STUDIO })
    await db.update(license).set({ activatedAt: null }).where(eq(license.key, key))
    vi.setSystemTime(LATER)

    const { result } = await activate({ key, machine: STUDIO })

    expect(result).toMatchObject({ data: { activationId }, status: HTTP_STATUS.OK, success: true })
    expect(await licenseRecords(key)).toStrictEqual({ activatedAt: LATER, deliveredAt: null })
  })

  it("records nothing when every slot is taken by machines activated elsewhere", async () => {
    const buyer = await buy()
    for (let slot = 0; slot < LICENSE_ACTIVATION_LIMITS[LICENSE_TIER.CORE]; slot++) {
      activatePolarLicenseKey(buyer.grant, `Portal machine ${String(slot)}`)
    }

    const { result } = await activate({ key: buyer.key, machine: LAPTOP }, LAPTOP_ACTIVATION)

    expect(result).toMatchObject({ failure: { code: API_ERROR.ACTIVATION_LIMIT_REACHED }, success: false })
    expect(await licenseRecords(buyer.key)).toStrictEqual({ activatedAt: null, deliveredAt: null })
  })

  it("answers serviceUnavailable while it cannot record the activation, and records it when the CLI retries", async () => {
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] })
    const buyer = await buy()
    const errors = consoleErrors()
    const restore = await refuseRecordWrites(license.activatedAt)

    expectServiceUnavailable(await activate({ key: buyer.key, machine: STUDIO }))
    expectFailureLogged(errors, API_ENDPOINT.ACTIVATE, RECORD_OUTAGE)
    expect(await licenseRecords(buyer.key)).toStrictEqual({ activatedAt: null, deliveredAt: null })

    await restore()
    vi.setSystemTime(LATER)
    const { result } = await activate({ key: buyer.key, machine: STUDIO })

    const [activation] = polarLicenseKeyOf(buyer.grant).activations
    expect(result).toStrictEqual({
      data: { activationId: activation?.id, license: summary(LICENSE_TIER.CORE, 1) },
      status: HTTP_STATUS.OK,
      success: true,
    })
    expect(await licenseRecords(buyer.key)).toStrictEqual({ activatedAt: LATER, deliveredAt: null })
  })
})

describe("GET /activations/:activationId", () => {
  it("confirms the calling machine's activation", async () => {
    const buyer = await buy(LICENSE_TIER.AGENCY)
    const activationId = await activated({ key: buyer.key, machine: STUDIO })
    await activated({ key: buyer.key, machine: CI }, CI_ACTIVATION)

    const { result } = await validate({ key: buyer.key, machine: STUDIO }, activationId)

    expect(result).toStrictEqual({ data: { license: summary(LICENSE_TIER.AGENCY, 2) }, status: HTTP_STATUS.OK, success: true })
  })

  it("answers activationNotFound for an unknown activation, another machine's activation and a released one", async () => {
    const buyer = await buy()
    const studio = await activated({ key: buyer.key, machine: STUDIO })
    const laptop = await activated({ key: buyer.key, machine: LAPTOP }, LAPTOP_ACTIVATION)
    await deactivate({ key: buyer.key, machine: STUDIO }, laptop)

    const results = await Promise.all([
      validate({ key: buyer.key, machine: STUDIO }, crypto.randomUUID()),
      validate({ key: buyer.key, machine: LAPTOP }, studio),
      validate({ key: buyer.key, machine: LAPTOP }, laptop),
    ])

    expect(results.map(({ result }) => result)).toStrictEqual(
      Array.from({ length: 3 }, () => ({ failure: { code: API_ERROR.ACTIVATION_NOT_FOUND }, success: false })),
    )
  })
})

describe("DELETE /activations/:activationId", () => {
  it("releases any machine of the key and frees its slot", async () => {
    const buyer = await buy()
    const studio = await activated({ key: buyer.key, machine: STUDIO })
    const ci = await activated({ key: buyer.key, machine: CI }, CI_ACTIVATION)

    const { result } = await deactivate({ key: buyer.key, machine: STUDIO }, ci)

    expect(result).toStrictEqual({ data: { license: summary(LICENSE_TIER.CORE, 1) }, status: HTTP_STATUS.OK, success: true })
    expect(polarLicenseKeyOf(buyer.grant).activations.map(({ id }) => id)).toStrictEqual([studio])
  })

  it("answers activationNotFound for an unknown activation and for one held by another key, which stays activated", async () => {
    const owner = await buy()
    const other = await buy()
    const ownerMachine = await activated({ key: owner.key, machine: STUDIO })

    const results = await Promise.all([
      deactivate({ key: other.key, machine: LAPTOP }, crypto.randomUUID()),
      deactivate({ key: other.key, machine: LAPTOP }, ownerMachine),
    ])

    expect(results.map(({ result }) => result)).toStrictEqual(
      Array.from({ length: 2 }, () => ({ failure: { code: API_ERROR.ACTIVATION_NOT_FOUND }, success: false })),
    )
    expect(polarLicenseKeyOf(owner.grant).activations.map(({ id }) => id)).toStrictEqual([ownerMachine])
  })
})

describe("licence keys", () => {
  it.each(ENDPOINT_CALLS)("answers $name for an unknown key with invalidLicenseKey and the Bearer challenge", async ({ call }) => {
    const { headers, result } = await call({ key: UNKNOWN_KEY, machine: STUDIO })

    expect(result).toStrictEqual({ failure: { code: API_ERROR.INVALID_LICENSE_KEY }, success: false })
    expect(headers.get(API_HEADER.WWW_AUTHENTICATE)).toBe(AUTHORIZATION_SCHEME)
  })

  it.each(ENDPOINT_CALLS)("answers $name with licenseRefunded once Polar reports the order refunded", async ({ call }) => {
    const buyer = await buy()
    await licenseWebhookHandlers.onOrderRefunded({ data: refundPolarOrder(buyer.order.id, buyer.order.net_amount) })
    await licenseWebhookHandlers.onBenefitGrantRevoked({ data: revokePolarLicenseKey(buyer.grant) })

    const { result } = await call({ key: buyer.key, machine: STUDIO })

    expect(result).toStrictEqual({ failure: { code: API_ERROR.LICENSE_REFUNDED }, success: false })
  })

  it.each(ENDPOINT_CALLS)("answers $name with licenseRevoked once Polar revokes the licence without a refund", async ({ call }) => {
    const buyer = await buy()
    await licenseWebhookHandlers.onBenefitGrantRevoked({ data: revokePolarLicenseKey(buyer.grant) })

    const { result } = await call({ key: buyer.key, machine: STUDIO })

    expect(result).toStrictEqual({ failure: { code: API_ERROR.LICENSE_REVOKED }, success: false })
  })

  it.each(ENDPOINT_CALLS)("answers $name with licenseRevoked when Polar revoked the key before its webhook arrived", async ({ call }) => {
    const buyer = await buy()
    revokePolarLicenseKey(buyer.grant)

    const { result } = await call({ key: buyer.key, machine: STUDIO })

    expect(result).toStrictEqual({ failure: { code: API_ERROR.LICENSE_REVOKED }, success: false })
  })

  it("refuses a key whose licence no longer names its Polar licence key, without asking Polar", async () => {
    const buyer = await buy()
    await db.update(license).set({ polarLicenseKeyId: null }).where(eq(license.key, buyer.key))
    const polarRequests = vi.spyOn(globalThis, "fetch")

    const { result } = await getLicense({ key: buyer.key, machine: STUDIO })

    expect(result).toStrictEqual({ failure: { code: API_ERROR.INVALID_LICENSE_KEY }, success: false })
    expect(polarRequests).not.toHaveBeenCalled()
  })

  it.each([
    ["no authorization", {}],
    ["another scheme", { [API_HEADER.AUTHORIZATION]: "Basic c2Fhc3lsYW5k" }],
    ["a key that cannot be one", { [API_HEADER.AUTHORIZATION]: `${AUTHORIZATION_SCHEME} not a key` }],
  ])("answers a request with %s with invalidLicenseKey", async (_case, authorization) => {
    const request = rawRequest(API_ROUTE.LICENSE, {
      headers: { ...authorization, [API_HEADER.MACHINE]: STUDIO, [IP_ADDRESS_HEADER]: ADDRESS },
    })

    const { headers, result } = await exchange(API_ENDPOINT.LICENSE, licenseApiHandlers.license, request)

    expect(result).toStrictEqual({ failure: { code: API_ERROR.INVALID_LICENSE_KEY }, success: false })
    expect(headers.get(API_HEADER.WWW_AUTHENTICATE)).toBe(AUTHORIZATION_SCHEME)
  })
})

describe("invalid requests", () => {
  it("names every activation field that breaks the contract, without asking Polar", async () => {
    const { key } = await buy()
    const polarRequests = vi.spyOn(globalThis, "fetch")
    const body = { ...STUDIO_ACTIVATION.body, kind: "laptop", label: "x".repeat(API_LIMIT.LABEL_MAX_LENGTH + 1) }
    const request = rawRequest(API_ROUTE.ACTIVATIONS, {
      body: JSON.stringify(body),
      headers: signedHeaders(key, STUDIO),
      method: HTTP_METHOD.POST,
    })

    const { result } = await exchange(API_ENDPOINT.ACTIVATE, licenseApiHandlers.activate, request)

    expectInvalid(result, "body.kind", "body.label")
    expect(polarRequests).not.toHaveBeenCalled()
  })

  it("refuses an activation whose body is not JSON", async () => {
    const { key } = await buy()
    const request = rawRequest(API_ROUTE.ACTIVATIONS, { body: "{", headers: signedHeaders(key, STUDIO), method: HTTP_METHOD.POST })

    const { result } = await exchange(API_ENDPOINT.ACTIVATE, licenseApiHandlers.activate, request)

    expectInvalid(result, "body")
  })

  it("refuses a request without the machine header", async () => {
    const { key } = await buy()
    const headers = new Headers(signedHeaders(key, STUDIO))
    headers.delete(API_HEADER.MACHINE)

    const { result } = await exchange(API_ENDPOINT.LICENSE, licenseApiHandlers.license, rawRequest(API_ROUTE.LICENSE, { headers }))

    expectInvalid(result, `headers.${API_HEADER.MACHINE}`)
  })

  it("refuses an activation id that is not a UUID", async () => {
    const { key } = await buy()
    const request = (method: Api["httpMethod"]) =>
      rawRequest(`${API_ROUTE.ACTIVATIONS}/not-an-id`, { headers: signedHeaders(key, STUDIO), method })

    const validation = await exchange(API_ENDPOINT.VALIDATE, licenseApiHandlers.validate, request(HTTP_METHOD.GET))
    const release = await exchange(API_ENDPOINT.DEACTIVATE, licenseApiHandlers.deactivate, request(HTTP_METHOD.DELETE))

    expectInvalid(validation.result, `params.${ROUTE_PARAMETER.ACTIVATION_ID}`)
    expectInvalid(release.result, `params.${ROUTE_PARAMETER.ACTIVATION_ID}`)
  })
})

describe("rate limits", () => {
  it("answers rateLimited to an address once it has sent the limit in one period, before reading the key", async () => {
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] })
    const { key } = await buy()
    for (let request = 0; request < RATE_LIMIT.REQUESTS_PER_ADDRESS; request++) {
      await licenseApiHandlers.license({
        params: {},
        request: rawRequest(API_ROUTE.LICENSE, { headers: { [IP_ADDRESS_HEADER]: ADDRESS } }),
      })
    }

    const limited = await getLicense({ key, machine: STUDIO })
    const keyless = await licenseApiHandlers.license({
      params: {},
      request: rawRequest(API_ROUTE.LICENSE, { headers: { [IP_ADDRESS_HEADER]: ADDRESS } }),
    })

    expect(limited.result).toStrictEqual({
      failure: { code: API_ERROR.RATE_LIMITED, retryAfterSeconds: RATE_LIMIT.PERIOD_SECONDS },
      success: false,
    })
    expect(limited.headers.get(API_HEADER.RETRY_AFTER)).toBe(String(RATE_LIMIT.PERIOD_SECONDS))
    expect(keyless.status).toBe(HTTP_STATUS.TOO_MANY_REQUESTS)
    const elsewhere = await getLicense({ address: OTHER_ADDRESS, key, machine: STUDIO })
    expect(elsewhere.result.success).toBe(true)

    vi.setSystemTime(NOW.getTime() + RATE_LIMIT.PERIOD_SECONDS * MILLISECONDS_PER_SECOND)

    const nextPeriod = await getLicense({ key, machine: STUDIO })
    expect(nextPeriod.result.success).toBe(true)
  })

  it("answers rateLimited to every address once a key has sent its limit in one period", async () => {
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] })
    const limited = await buy()
    const other = await buy()
    for (let request = 0; request < RATE_LIMIT.REQUESTS_PER_LICENSE_KEY; request++) {
      await getLicense({ address: keyLimitAddress(request), key: limited.key, machine: STUDIO })
    }

    const { headers, result } = await getLicense({ address: OTHER_ADDRESS, key: limited.key, machine: STUDIO })

    expect(result).toStrictEqual({
      failure: { code: API_ERROR.RATE_LIMITED, retryAfterSeconds: RATE_LIMIT.PERIOD_SECONDS },
      success: false,
    })
    expect(headers.get(API_HEADER.RETRY_AFTER)).toBe(String(RATE_LIMIT.PERIOD_SECONDS))
    const otherKey = await getLicense({ address: OTHER_ADDRESS, key: other.key, machine: STUDIO })
    expect(otherKey.result.success).toBe(true)
  })

  it("does not count the requests that the address limit refused against the key", async () => {
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] })
    const { key } = await buy()
    for (let request = 0; request < RATE_LIMIT.REQUESTS_PER_ADDRESS + REFUSED_BY_ADDRESS; request++) {
      await getLicense({ key, machine: STUDIO })
    }

    const keyRequestsLeft = RATE_LIMIT.REQUESTS_PER_LICENSE_KEY - RATE_LIMIT.REQUESTS_PER_ADDRESS
    const answers = []
    for (let request = 0; request <= keyRequestsLeft; request++) {
      const { result } = await getLicense({ address: keyLimitAddress(request), key, machine: STUDIO })
      answers.push(result.success)
    }

    expect(answers).toStrictEqual([...Array.from({ length: keyRequestsLeft }, () => true), false])
  })

  it.each(EXHAUSTED_LIMITS)(
    "refuses a request over the $limit limit before it reads the body",
    async ({ refusedFrom, requests, sentFrom }) => {
      vi.useFakeTimers({ now: NOW, toFake: ["Date"] })
      const { key } = await buy()
      for (let request = 0; request < requests; request++) {
        await getLicense({ address: sentFrom(request), key, machine: STUDIO })
      }
      const refused = activationFrom(key, refusedFrom)

      const { result } = await exchange(API_ENDPOINT.ACTIVATE, licenseApiHandlers.activate, refused)

      expect(result).toStrictEqual({
        failure: { code: API_ERROR.RATE_LIMITED, retryAfterSeconds: RATE_LIMIT.PERIOD_SECONDS },
        success: false,
      })
      expect(refused.bodyUsed).toBe(false)
    },
  )

  it("reads the body of a request that both limits admit", async () => {
    const { key } = await buy()
    const admitted = activationFrom(key, ADDRESS)

    const { result } = await exchange(API_ENDPOINT.ACTIVATE, licenseApiHandlers.activate, admitted)

    expect(result).toMatchObject({ status: HTTP_STATUS.CREATED, success: true })
    expect(admitted.bodyUsed).toBe(true)
  })

  it("counts a request against both limits and reads its licence in one round trip to D1", async () => {
    const { key } = await buy()
    const batches = vi.spyOn(env.DB, "batch")
    const statements = vi.spyOn(env.DB, "prepare")

    const { result } = await getLicense({ key, machine: STUDIO })

    expect(result.success).toBe(true)
    expect(batches).toHaveBeenCalledOnce()
    expect(statements).toHaveBeenCalledTimes(batches.mock.calls.flatMap(([batch]) => batch).length)
  })
})

describe("server-side failures", () => {
  it.each(ENDPOINT_CALLS)(
    "answers $name with serviceUnavailable, not rateLimited, when D1 cannot count the request, and logs the failure",
    async ({ call, endpoint }) => {
      const { key } = await buy()
      const errors = consoleErrors()
      vi.spyOn(db, "batch").mockRejectedValueOnce(new Error(D1_OUTAGE))

      expectServiceUnavailable(await call({ key, machine: STUDIO }))
      expectFailureLogged(errors, endpoint, D1_OUTAGE)
    },
  )

  it("answers a request without a key with serviceUnavailable when its address cannot be counted", async () => {
    const errors = consoleErrors()
    vi.spyOn(db, "batch").mockRejectedValueOnce(new Error(D1_OUTAGE))
    const request = rawRequest(API_ROUTE.LICENSE, { headers: { [API_HEADER.MACHINE]: STUDIO, [IP_ADDRESS_HEADER]: ADDRESS } })

    expectServiceUnavailable(await exchange(API_ENDPOINT.LICENSE, licenseApiHandlers.license, request))
    expectFailureLogged(errors, API_ENDPOINT.LICENSE, D1_OUTAGE)
  })

  it.each(ENDPOINT_CALLS)(
    "answers $name with serviceUnavailable when D1 cannot read the licence, and logs it without the key",
    async ({ call, endpoint }) => {
      const { key } = await buy()
      const errors = consoleErrors()
      await takeLicenseTableOffline()

      expectServiceUnavailable(await call({ key, machine: STUDIO }))
      expectFailureLogged(errors, endpoint, MISSING_LICENSE_TABLE)
      expectKeyNotLogged(errors, key)
    },
  )

  describe.each(POLAR_FAILURES)("when Polar $failure", ({ answer, reason }) => {
    it.each(ENDPOINT_CALLS)("answers $name with serviceUnavailable and retry-after, and logs the failure", async ({ call, endpoint }) => {
      const { key } = await buy()
      const errors = consoleErrors()
      failingPolar(HTTP_METHOD.GET, answer)

      expectServiceUnavailable(await call({ key, machine: STUDIO }))
      expectFailureLogged(errors, endpoint, reason)
    })

    it("answers an activation that Polar fails to record with serviceUnavailable, and logs it without the key", async () => {
      const { key } = await buy()
      const errors = consoleErrors()
      failingPolar(HTTP_METHOD.POST, answer)

      expectServiceUnavailable(await activate({ key, machine: STUDIO }))
      expectFailureLogged(errors, API_ENDPOINT.ACTIVATE, reason)
      expectKeyNotLogged(errors, key)
    })

    it("answers a release that Polar fails to record with serviceUnavailable, keeps the machine and logs it without the key", async () => {
      const buyer = await buy()
      const activationId = await activated({ key: buyer.key, machine: STUDIO })
      const errors = consoleErrors()
      failingPolar(HTTP_METHOD.POST, answer)

      expectServiceUnavailable(await deactivate({ key: buyer.key, machine: STUDIO }, activationId))
      expectFailureLogged(errors, API_ENDPOINT.DEACTIVATE, reason)
      expectKeyNotLogged(errors, buyer.key)
      expect(polarLicenseKeyOf(buyer.grant).activations).toHaveLength(1)
    })
  })
})
