import type { models } from "@polar-sh/sdk/2026-10"
import { STACK_DEFAULTS } from "@saasyland/stack"
import {
  ACTIVATION_KIND,
  API_BASE_PATH,
  API_ENDPOINT,
  API_ERROR,
  API_HEADER,
  AUTHORIZATION_SCHEME,
  type Api,
  PLATFORM,
  apiRequest,
  ciRepository,
  deriveMachineId,
  readApiResponse,
} from "@saasyland/stack/api"
import { assert, expect } from "vite-plus/test"
import type * as zod from "zod"

import { TEST_APP_URL } from "~/src/platform/testing/lib/test-request"
import { createPolarOrder, grantPolarLicenseKey, polarLicenseKeyOf } from "~/src/platform/testing/mocks/polar"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { IP_ADDRESS_HEADER } from "~/src/modules/_core/constants/api"
import { licenseApiHandlers } from "~/src/modules/license/license.api"
import {
  LICENSE_ACTIVATION_LIMITS,
  LICENSE_API_RETRY_AFTER_SECONDS,
  LICENSE_TIER,
  type LicenseTier,
} from "~/src/modules/license/license.constants"
import { POLAR_PRODUCT_IDS } from "~/src/modules/license/license.utils"
import { licenseWebhookHandlers } from "~/src/modules/license/license.webhooks"
import { user } from "~/src/modules/user/user.schema"

export const ADDRESS = "203.0.113.10"
export const OTHER_ADDRESS = "203.0.113.20"
export const CLI_VERSION = "0.1.0"
export const NEWER_CLI_VERSION = "0.2.0"
export const UNKNOWN_KEY = "SAASYLAND-00000000-0000-4000-8000-000000000000"
export const NOW = new Date("2026-11-14T10:00:00.000Z")
const GITHUB_ENVIRONMENT = {
  GITHUB_REPOSITORY: "saasyland/app",
  GITHUB_REPOSITORY_ID: "873621045",
  GITHUB_SERVER_URL: "https://github.com",
}

const repository = ciRepository(GITHUB_ENVIRONMENT)
assert(repository)

export const STUDIO = await deriveMachineId(ACTIVATION_KIND.MACHINE, ["4c4c4544-0042-3510-8052-b4c04f4e3332"])
export const LAPTOP = await deriveMachineId(ACTIVATION_KIND.MACHINE, ["0f8a3c51d2e94b7c9a6d5e4f3b2c1a09"])
export const CI = await deriveMachineId(ACTIVATION_KIND.CI, repository.identity)

export const STUDIO_ACTIVATION = {
  body: { cliVersion: CLI_VERSION, kind: ACTIVATION_KIND.MACHINE, label: "studio-mac", platform: PLATFORM.MACOS },
} satisfies Api["activateRequest"]
export const LAPTOP_ACTIVATION = {
  body: { ...STUDIO_ACTIVATION.body, label: "work-laptop", platform: PLATFORM.WINDOWS },
} satisfies Api["activateRequest"]
export const CI_ACTIVATION = {
  body: { cliVersion: CLI_VERSION, kind: ACTIVATION_KIND.CI, label: `GitHub Actions ${repository.name}`, platform: PLATFORM.LINUX },
} satisfies Api["activateRequest"]

export const BUNDLE_REQUEST = { answers: STACK_DEFAULTS, version: CLI_VERSION } satisfies Api["bundleRequest"]["body"]

export interface Buyer {
  readonly grant: models.BenefitGrantLicenseKeysWebhook
  readonly key: string
  readonly order: models.Order
}

export interface Credentials {
  readonly address?: string
  readonly key: string
  readonly machine: string
}

interface ApiCall {
  readonly params: unknown
  readonly request: Request
}

export const buy = async (tier: LicenseTier = LICENSE_TIER.CORE): Promise<Buyer> => {
  const userId = crypto.randomUUID()
  await db.insert(user).values({ email: `${userId}@example.test`, id: userId, name: "Buyer" })
  const order = createPolarOrder({ externalCustomerId: userId, productId: POLAR_PRODUCT_IDS[tier] })
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

export const exchange = async <Schema extends zod.ZodType>(
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

export const getLicense = (credentials: Credentials) =>
  exchange(
    API_ENDPOINT.LICENSE,
    licenseApiHandlers.license,
    connect(credentials, (connection) => apiRequest(API_ENDPOINT.LICENSE, {}, connection)),
  )

export const activate = (credentials: Credentials, input: Api["activateRequest"] = STUDIO_ACTIVATION) =>
  exchange(
    API_ENDPOINT.ACTIVATE,
    licenseApiHandlers.activate,
    connect(credentials, (connection) => apiRequest(API_ENDPOINT.ACTIVATE, input, connection)),
  )

export const validate = (credentials: Credentials, activationId: string) =>
  exchange(
    API_ENDPOINT.VALIDATE,
    licenseApiHandlers.validate,
    connect(credentials, (connection) => apiRequest(API_ENDPOINT.VALIDATE, { params: { activationId } }, connection)),
  )

export const requestBundle = (credentials: Credentials, activationId: string, body: Api["bundleRequest"]["body"] = BUNDLE_REQUEST) =>
  exchange(
    API_ENDPOINT.BUNDLE,
    licenseApiHandlers.bundle,
    connect(credentials, (connection) => apiRequest(API_ENDPOINT.BUNDLE, { body, params: { activationId } }, connection)),
  )

export const deactivate = (credentials: Credentials, activationId: string) =>
  exchange(
    API_ENDPOINT.DEACTIVATE,
    licenseApiHandlers.deactivate,
    connect(credentials, (connection) => apiRequest(API_ENDPOINT.DEACTIVATE, { params: { activationId } }, connection)),
  )

export const activated = async (credentials: Credentials, input: Api["activateRequest"] = STUDIO_ACTIVATION): Promise<string> => {
  const { result } = await activate(credentials, input)
  assert(result.success)
  return result.data.activationId
}

export const summary = (tier: LicenseTier, machinesUsed: number): Api["license"] => ({
  machineLimit: LICENSE_ACTIVATION_LIMITS[tier],
  machinesUsed,
  tier,
})

export const ENDPOINT_CALLS = [
  { call: (credentials: Credentials) => getLicense(credentials), name: "LICENSE" },
  { call: (credentials: Credentials) => activate(credentials), name: "ACTIVATE" },
  { call: (credentials: Credentials) => validate(credentials, crypto.randomUUID()), name: "VALIDATE" },
  { call: (credentials: Credentials) => requestBundle(credentials, crypto.randomUUID()), name: "BUNDLE" },
  { call: (credentials: Credentials) => deactivate(credentials, crypto.randomUUID()), name: "DEACTIVATE" },
] as const

export const SERVICE_UNAVAILABLE = {
  failure: { code: API_ERROR.SERVICE_UNAVAILABLE, retryAfterSeconds: LICENSE_API_RETRY_AFTER_SECONDS },
  success: false,
}

export const expectInvalid = (result: unknown, ...paths: string[]): void => {
  expect(result).toMatchObject({ failure: { code: API_ERROR.INVALID_REQUEST, issues: paths.map((path) => ({ path })) }, success: false })
}

export const rawRequest = (route: string, init: RequestInit): Request =>
  new Request(new URL(`${API_BASE_PATH}${route}`, TEST_APP_URL), init)

export const signedHeaders = (key: string, machine: string): Record<string, string> => ({
  [API_HEADER.AUTHORIZATION]: `${AUTHORIZATION_SCHEME} ${key}`,
  [API_HEADER.MACHINE]: machine,
  [IP_ADDRESS_HEADER]: ADDRESS,
})
