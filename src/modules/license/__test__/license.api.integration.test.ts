import type { models } from "@polar-sh/sdk/2026-10"
import {
  ACTIVATION_KIND,
  API_BASE_PATH,
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
  apiRequest,
  ciRepository,
  deriveMachineId,
  readApiResponse,
} from "@saasyland/stack/api"
import { eq } from "drizzle-orm"
import { afterEach, assert, describe, expect, it, vi } from "vite-plus/test"
import type * as zod from "zod"

import { TEST_APP_URL } from "~/src/platform/testing/lib/test-request"
import {
  activatePolarLicenseKey,
  createPolarOrder,
  grantPolarLicenseKey,
  polarActivationConditions,
  polarLicenseKeyOf,
  refundPolarOrder,
  revokePolarLicenseKey,
} from "~/src/platform/testing/mocks/polar"
import { fetchFromProviders } from "~/src/platform/testing/mocks/providers"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { HTTP_STATUS, IP_ADDRESS_HEADER } from "~/src/modules/_core/constants/api"
import { licenseApiHandlers } from "~/src/modules/license/license.api"
import {
  LICENSE_ACTIVATION_LIMITS,
  LICENSE_API_RETRY_AFTER_SECONDS,
  LICENSE_TIER,
  LICENSE_TIERS,
  type LicenseTier,
} from "~/src/modules/license/license.constants"
import { license } from "~/src/modules/license/license.schema"
import { licenseWebhookHandlers } from "~/src/modules/license/license.webhooks"
import { user } from "~/src/modules/user/user.schema"

import { MILLISECONDS_PER_SECOND } from "~/src/lib/duration"

const ADDRESS = "203.0.113.10"
const OTHER_ADDRESS = "203.0.113.20"
const CLI_VERSION = "0.1.0"
const NEWER_CLI_VERSION = "0.2.0"
const UNKNOWN_KEY = "SAASYLAND-00000000-0000-4000-8000-000000000000"
const NOW = new Date("2026-11-14T10:00:00.000Z")
const KEY_LIMIT_ADDRESSES = 3
const GITHUB_ENVIRONMENT = {
  GITHUB_REPOSITORY: "saasyland/app",
  GITHUB_REPOSITORY_ID: "873621045",
  GITHUB_SERVER_URL: "https://github.com",
}

const repository = ciRepository(GITHUB_ENVIRONMENT)
assert(repository)

const STUDIO = await deriveMachineId(ACTIVATION_KIND.MACHINE, ["4c4c4544-0042-3510-8052-b4c04f4e3332"])
const LAPTOP = await deriveMachineId(ACTIVATION_KIND.MACHINE, ["0f8a3c51d2e94b7c9a6d5e4f3b2c1a09"])
const CI = await deriveMachineId(ACTIVATION_KIND.CI, repository.identity)

const STUDIO_ACTIVATION = {
  body: { cliVersion: CLI_VERSION, kind: ACTIVATION_KIND.MACHINE, label: "studio-mac", platform: PLATFORM.MACOS },
} satisfies Api["activateRequest"]
const LAPTOP_ACTIVATION = {
  body: { ...STUDIO_ACTIVATION.body, label: "work-laptop", platform: PLATFORM.WINDOWS },
} satisfies Api["activateRequest"]
const CI_ACTIVATION = {
  body: { cliVersion: CLI_VERSION, kind: ACTIVATION_KIND.CI, label: `GitHub Actions ${repository.name}`, platform: PLATFORM.LINUX },
} satisfies Api["activateRequest"]

interface Buyer {
  readonly grant: models.BenefitGrantLicenseKeysWebhook
  readonly key: string
  readonly order: models.Order
}

interface Credentials {
  readonly address?: string
  readonly key: string
  readonly machine: string
}

interface ApiCall {
  readonly params: unknown
  readonly request: Request
}

const buy = async (tier: LicenseTier = LICENSE_TIER.CORE): Promise<Buyer> => {
  const userId = crypto.randomUUID()
  await db.insert(user).values({ email: `${userId}@example.test`, id: userId, name: "Buyer" })
  const order = createPolarOrder({ externalCustomerId: userId, tier })
  await licenseWebhookHandlers.onOrderPaid({ data: order })
  const grant = grantPolarLicenseKey(order)
  await licenseWebhookHandlers.onBenefitGrantCreated({ data: grant })
  return { grant, key: polarLicenseKeyOf(grant).key, order }
}

const connect = ({ address = ADDRESS, key, machine }: Credentials, build: (connection: Api["connection"]) => Request): Request => {
  const request = build({ credentials: { key, machine }, origin: TEST_APP_URL })
  const headers = new Headers(request.headers)
  headers.set(IP_ADDRESS_HEADER, address)
  return new Request(request, { headers })
}

const exchange = async <Schema extends zod.ZodType>(
  endpoint: {
    readonly errors: readonly Api["errorCode"][]
    readonly response: Schema
    readonly route: string
    readonly statuses: readonly number[]
  },
  handler: (call: ApiCall) => Promise<Response>,
  request: Request,
) => {
  const params = new URLPattern({ pathname: `${API_BASE_PATH}${endpoint.route}` }).exec(request.url)?.pathname.groups
  const response = await handler({ params, request })
  return { headers: response.headers, result: await readApiResponse(endpoint, response) }
}

const getLicense = (credentials: Credentials) =>
  exchange(
    API_ENDPOINT.LICENSE,
    licenseApiHandlers.license,
    connect(credentials, (connection) => apiRequest(API_ENDPOINT.LICENSE, {}, connection)),
  )

const activate = (credentials: Credentials, input: Api["activateRequest"] = STUDIO_ACTIVATION) =>
  exchange(
    API_ENDPOINT.ACTIVATE,
    licenseApiHandlers.activate,
    connect(credentials, (connection) => apiRequest(API_ENDPOINT.ACTIVATE, input, connection)),
  )

const validate = (credentials: Credentials, activationId: string) =>
  exchange(
    API_ENDPOINT.VALIDATE,
    licenseApiHandlers.validate,
    connect(credentials, (connection) => apiRequest(API_ENDPOINT.VALIDATE, { params: { activationId } }, connection)),
  )

const deactivate = (credentials: Credentials, activationId: string) =>
  exchange(
    API_ENDPOINT.DEACTIVATE,
    licenseApiHandlers.deactivate,
    connect(credentials, (connection) => apiRequest(API_ENDPOINT.DEACTIVATE, { params: { activationId } }, connection)),
  )

const activated = async (credentials: Credentials, input: Api["activateRequest"] = STUDIO_ACTIVATION): Promise<string> => {
  const { result } = await activate(credentials, input)
  assert(result.success)
  return result.data.activationId
}

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

const summary = (tier: LicenseTier, machinesUsed: number): Api["license"] => ({
  machineLimit: LICENSE_ACTIVATION_LIMITS[tier],
  machinesUsed,
  tier,
})

const ENDPOINT_CALLS = [
  { call: (credentials: Credentials) => getLicense(credentials), name: "LICENSE" },
  { call: (credentials: Credentials) => activate(credentials), name: "ACTIVATE" },
  { call: (credentials: Credentials) => validate(credentials, crypto.randomUUID()), name: "VALIDATE" },
  { call: (credentials: Credentials) => deactivate(credentials, crypto.randomUUID()), name: "DEACTIVATE" },
] as const

const failingPolar = (method: string, answer: () => Promise<Response>): void => {
  vi.stubGlobal("fetch", (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    const request = new Request(input, init)
    return request.method === method ? answer() : fetchFromProviders(request)
  })
}

const POLAR_OUTAGES = [
  { answer: (): Promise<Response> => Promise.reject(new TypeError("fetch failed")), outage: "cannot be reached" },
  {
    answer: (): Promise<Response> => Promise.resolve(new Response("upstream failed", { status: HTTP_STATUS.INTERNAL_SERVER_ERROR })),
    outage: "fails with a server error",
  },
  {
    answer: (): Promise<Response> => Promise.resolve(Response.json({ detail: "Rate limited" }, { status: HTTP_STATUS.TOO_MANY_REQUESTS })),
    outage: "throttles the organisation",
  },
]

const SERVICE_UNAVAILABLE = {
  failure: { code: API_ERROR.SERVICE_UNAVAILABLE, retryAfterSeconds: LICENSE_API_RETRY_AFTER_SECONDS },
  success: false,
}

const expectInvalid = (result: unknown, ...paths: string[]): void => {
  expect(result).toMatchObject({ failure: { code: API_ERROR.INVALID_REQUEST, issues: paths.map((path) => ({ path })) }, success: false })
}

const refusal = (status: number) => (): Promise<Response> => Promise.resolve(Response.json({ detail: "Refused" }, { status }))

const rawRequest = (route: string, init: RequestInit): Request => new Request(new URL(`${API_BASE_PATH}${route}`, TEST_APP_URL), init)

const signedHeaders = (key: string, machine: string): Record<string, string> => ({
  [API_HEADER.AUTHORIZATION]: `${AUTHORIZATION_SCHEME} ${key}`,
  [API_HEADER.MACHINE]: machine,
  [IP_ADDRESS_HEADER]: ADDRESS,
})

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

    expect(limited.result).toStrictEqual({
      failure: { code: API_ERROR.RATE_LIMITED, retryAfterSeconds: RATE_LIMIT.PERIOD_SECONDS },
      success: false,
    })
    expect(limited.headers.get(API_HEADER.RETRY_AFTER)).toBe(String(RATE_LIMIT.PERIOD_SECONDS))
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
      await getLicense({ address: `198.51.100.${String(request % KEY_LIMIT_ADDRESSES)}`, key: limited.key, machine: STUDIO })
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
})

describe.each(POLAR_OUTAGES)("when Polar $outage", ({ answer }) => {
  it.each(ENDPOINT_CALLS)("answers $name with serviceUnavailable and retry-after", async ({ call }) => {
    const { key } = await buy()
    failingPolar(HTTP_METHOD.GET, answer)

    const { headers, result } = await call({ key, machine: STUDIO })

    expect(result).toStrictEqual(SERVICE_UNAVAILABLE)
    expect(headers.get(API_HEADER.RETRY_AFTER)).toBe(String(LICENSE_API_RETRY_AFTER_SECONDS))
  })

  it("answers an activation that Polar fails to record with serviceUnavailable", async () => {
    const { key } = await buy()
    failingPolar(HTTP_METHOD.POST, answer)

    const { result } = await activate({ key, machine: STUDIO })

    expect(result).toStrictEqual(SERVICE_UNAVAILABLE)
  })

  it("answers a release that Polar fails to record with serviceUnavailable and keeps the machine", async () => {
    const buyer = await buy()
    const activationId = await activated({ key: buyer.key, machine: STUDIO })
    failingPolar(HTTP_METHOD.POST, answer)

    const { result } = await deactivate({ key: buyer.key, machine: STUDIO }, activationId)

    expect(result).toStrictEqual(SERVICE_UNAVAILABLE)
    expect(polarLicenseKeyOf(buyer.grant).activations).toHaveLength(1)
  })
})

describe("unexpected Polar answers", () => {
  it("fails the request when Polar rejects the access token", async () => {
    const { key } = await buy()
    failingPolar(HTTP_METHOD.GET, refusal(HTTP_STATUS.UNAUTHORIZED))

    await expect(getLicense({ key, machine: STUDIO })).rejects.toThrow(String(HTTP_STATUS.UNAUTHORIZED))
  })

  it("fails an activation Polar refuses as invalid", async () => {
    const { key } = await buy()
    failingPolar(HTTP_METHOD.POST, refusal(HTTP_STATUS.UNPROCESSABLE_CONTENT))

    await expect(activate({ key, machine: STUDIO })).rejects.toThrow(String(HTTP_STATUS.UNPROCESSABLE_CONTENT))
  })

  it("fails a release Polar refuses as invalid", async () => {
    const { key } = await buy()
    failingPolar(HTTP_METHOD.POST, refusal(HTTP_STATUS.UNPROCESSABLE_CONTENT))

    await expect(deactivate({ key, machine: STUDIO }, crypto.randomUUID())).rejects.toThrow(String(HTTP_STATUS.UNPROCESSABLE_CONTENT))
  })
})
