import "@tanstack/react-start/server-only"

import { env } from "cloudflare:workers"

import { errors, type models } from "@polar-sh/sdk/2026-10"
import {
  API_BASE_PATH,
  API_ENDPOINT,
  API_ERROR,
  API_HEADER,
  type Api,
  HTTP_STATUS,
  RATE_LIMIT,
  apiErrorResponse,
  apiResponse,
  apiZodSchemas,
  readApiRequest,
} from "@saasyland/stack/api"
import { and, eq, isNull } from "drizzle-orm"
import { createHash } from "node:crypto"
import { inspect } from "node:util"
import type * as zod from "zod"

import { clientAddress } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { polar } from "~/src/integrations/polar/polar.config"
import { POLAR_LICENSE_KEY_STATUS } from "~/src/integrations/polar/polar.constants"

import { bundleObjectKey, signBundle } from "~/src/modules/license/license.bundles"
import {
  LICENSE_ACTIVATION_LIMITS,
  LICENSE_API_RETRY_AFTER_SECONDS,
  LICENSE_STATUS,
  type LicenseTier,
} from "~/src/modules/license/license.constants"
import { license } from "~/src/modules/license/license.schema"

import { sha256Hex } from "~/src/lib/hex"
import { type RateLimitDecision, type RateLimitInput, countRequest, rateLimitBatch } from "~/src/lib/rate-limit"

const SINGLE_ROW = 1
const ONE_SLOT = 1
const ADDRESS_RATE_LIMIT_PREFIX = "cli:address:"
const LICENSE_KEY_RATE_LIMIT_PREFIX = "cli:key:"
const ARCHIVE_COMPRESSION = "gzip"
const DIGEST_ALGORITHM = "sha256"
const DIGEST_ENCODING = "hex"
const REDACTED_LICENSE_KEY = "[licence key]"

const SERVICE_UNAVAILABLE = { code: API_ERROR.SERVICE_UNAVAILABLE, retryAfterSeconds: LICENSE_API_RETRY_AFTER_SECONDS } as const

const REFUSED_STATUSES = {
  [LICENSE_STATUS.REFUNDED]: API_ERROR.LICENSE_REFUNDED,
  [LICENSE_STATUS.REVOKED]: API_ERROR.LICENSE_REVOKED,
} as const

const activationMetaSchema = API_ENDPOINT.ACTIVATE.request.shape.body
  .omit({ label: true })
  .extend({ machine: apiZodSchemas.machineId })
  .partial()

interface Endpoint<Schema extends zod.ZodType> {
  readonly errors: readonly Api["errorCode"][]
  readonly method: Api["httpMethod"]
  readonly request: Schema
  readonly route: string
}

interface ApiCall {
  readonly params: unknown
  readonly request: Request
}

interface Licence<Input> {
  readonly credentials: Api["credentials"]
  readonly input: Input
  readonly licenseKey: models.LicenseKeyWithActivations
  readonly tier: LicenseTier
}

type Admission<Input> = (Licence<Input> & { readonly success: true }) | { readonly error: Api["error"]; readonly success: false }

type StoredBundle =
  | { readonly bundle: Pick<Api["bundleResponse"], "sha256" | "size">; readonly success: true }
  | { readonly error: Extract<Api["error"], { readonly code: typeof API_ERROR.VERSION_NOT_FOUND }>; readonly success: false }

const refuse = (error: Api["error"]): Admission<never> => ({ error, success: false })

const summary = (tier: LicenseTier, machinesUsed: number): Api["license"] => ({
  machineLimit: LICENSE_ACTIVATION_LIMITS[tier],
  machinesUsed,
  tier,
})

const machinesOf = ({ activations }: models.LicenseKeyWithActivations, machine: Api["machineId"]): Api["machine"][] =>
  activations.map(({ created_at: createdAt, id, label, meta }) => {
    const parsed = activationMetaSchema.safeParse(meta)
    const { machine: activationMachine, ...details } = parsed.success ? parsed.data : {}

    return { ...details, createdAt: new Date(createdAt).toISOString(), current: activationMachine === machine, id, label }
  })

const holdsActivation = (machines: readonly Api["machine"][], activationId: string): boolean =>
  machines.some(({ current, id }) => current && id === activationId)

const contentDigest = async ({ body }: R2ObjectBody): Promise<string> => {
  const hash = createHash(DIGEST_ALGORITHM)

  await body.pipeThrough(new DecompressionStream(ARCHIVE_COMPRESSION)).pipeTo(
    new WritableStream({
      write: (chunk) => {
        hash.update(chunk)
      },
    }),
  )

  return hash.digest(DIGEST_ENCODING)
}

const storedBundle = async (version: string): Promise<StoredBundle> => {
  const object = await env.BUNDLES.get(bundleObjectKey(version))

  if (object === null) {
    return { error: { code: API_ERROR.VERSION_NOT_FOUND, version }, success: false }
  }

  return { bundle: { sha256: await contentDigest(object), size: object.size }, success: true }
}

const perPeriod = (key: string, limit: number): RateLimitInput => ({ key, limit, windowSeconds: RATE_LIMIT.PERIOD_SECONDS })

const rateLimitError = ({ allowed, retryAfter }: RateLimitDecision): Api["error"] | undefined =>
  allowed ? undefined : { code: API_ERROR.RATE_LIMITED, retryAfterSeconds: retryAfter }

const recordFirstActivation = async (key: string): Promise<void> => {
  await db
    .update(license)
    .set({ activatedAt: new Date() })
    .where(and(eq(license.key, key), isNull(license.activatedAt)))
}

const recordFirstDelivery = async (key: string): Promise<void> => {
  await db
    .update(license)
    .set({ deliveredAt: new Date() })
    .where(and(eq(license.key, key), isNull(license.deliveredAt)))
}

const presentedKey = ({ headers }: Request) => apiZodSchemas.authorization.safeParse(headers.get(API_HEADER.AUTHORIZATION))

const countAndFindLicense = async (address: RateLimitInput, key: string) => {
  const rateLimits = rateLimitBatch([
    address,
    perPeriod(`${LICENSE_KEY_RATE_LIMIT_PREFIX}${await sha256Hex(key)}`, RATE_LIMIT.REQUESTS_PER_LICENSE_KEY),
  ])
  const [[row], ...counters] = await db.batch([
    db
      .select({ polarLicenseKeyId: license.polarLicenseKeyId, status: license.status, tier: license.tier })
      .from(license)
      .where(eq(license.key, key))
      .limit(SINGLE_ROW),
    ...rateLimits.statements,
  ])

  return { limited: rateLimitError(rateLimits.decision(counters)), row }
}

const admit = async <Schema extends zod.ZodType>(
  endpoint: Endpoint<Schema>,
  { params, request }: ApiCall,
): Promise<Admission<zod.output<Schema>>> => {
  const address = perPeriod(`${ADDRESS_RATE_LIMIT_PREFIX}${clientAddress(request.headers)}`, RATE_LIMIT.REQUESTS_PER_ADDRESS)
  const key = presentedKey(request)

  if (!key.success) {
    return refuse(rateLimitError(await countRequest(address)) ?? { code: API_ERROR.INVALID_LICENSE_KEY })
  }

  const { limited, row } = await countAndFindLicense(address, key.data)

  if (limited !== undefined) {
    return refuse(limited)
  }

  const read = await readApiRequest(endpoint, request, params)

  if (!read.success) {
    return refuse(read.error)
  }

  if (typeof row?.polarLicenseKeyId !== "string") {
    return refuse({ code: API_ERROR.INVALID_LICENSE_KEY })
  }

  if (row.status !== LICENSE_STATUS.ACTIVE) {
    return refuse({ code: REFUSED_STATUSES[row.status] })
  }

  const licenseKey = await polar.licenseKeys.get(row.polarLicenseKeyId)

  if (licenseKey.status !== POLAR_LICENSE_KEY_STATUS.GRANTED) {
    return refuse({ code: API_ERROR.LICENSE_REVOKED })
  }

  return { credentials: read.credentials, input: read.request, licenseKey, success: true, tier: row.tier }
}

const describeFailure = (error: unknown, request: Request): string => {
  const failure = inspect(error)
  const key = presentedKey(request)

  return key.success ? failure.replaceAll(key.data, REDACTED_LICENSE_KEY) : failure
}

const serve = async <Schema extends zod.ZodType>(
  endpoint: Endpoint<Schema>,
  call: ApiCall,
  operation: (licence: Licence<zod.output<Schema>>) => Promise<Response> | Response,
): Promise<Response> => {
  try {
    const admission = await admit(endpoint, call)

    if (!admission.success) {
      return apiErrorResponse(endpoint, admission.error)
    }

    return await operation(admission)
  } catch (error) {
    console.error(`[license] ${endpoint.method} ${API_BASE_PATH}${endpoint.route} failed`, describeFailure(error, call.request))

    return apiErrorResponse(endpoint, SERVICE_UNAVAILABLE)
  }
}

export const licenseApiHandlers = {
  activate: (call: ApiCall): Promise<Response> =>
    serve(API_ENDPOINT.ACTIVATE, call, async ({ credentials, input: { body }, licenseKey, tier }) => {
      const machines = machinesOf(licenseKey, credentials.machine)
      const current = machines.find((machine) => machine.current)

      if (current !== undefined) {
        await recordFirstActivation(credentials.key)
        return apiResponse(API_ENDPOINT.ACTIVATE, HTTP_STATUS.OK, { activationId: current.id, license: summary(tier, machines.length) })
      }

      const { label, ...details } = body

      try {
        const { id } = await polar.licenseKeys.activate({
          conditions: { machine: credentials.machine },
          key: credentials.key,
          label,
          meta: { ...details, machine: credentials.machine },
          organization_id: env.POLAR_ORGANIZATION_ID,
        })
        await recordFirstActivation(credentials.key)

        return apiResponse(API_ENDPOINT.ACTIVATE, HTTP_STATUS.CREATED, {
          activationId: id,
          license: summary(tier, machines.length + ONE_SLOT),
        })
      } catch (error) {
        if (error instanceof errors.NotPermitted) {
          return apiErrorResponse(API_ENDPOINT.ACTIVATE, {
            code: API_ERROR.ACTIVATION_LIMIT_REACHED,
            license: summary(tier, machines.length),
            machines,
          })
        }

        throw error
      }
    }),

  bundle: (call: ApiCall): Promise<Response> =>
    serve(API_ENDPOINT.BUNDLE, call, async ({ credentials, input: { body, params }, licenseKey }) => {
      if (!holdsActivation(machinesOf(licenseKey, credentials.machine), params.activationId)) {
        return apiErrorResponse(API_ENDPOINT.BUNDLE, { code: API_ERROR.ACTIVATION_NOT_FOUND })
      }

      const stored = await storedBundle(body.version)

      if (!stored.success) {
        return apiErrorResponse(API_ENDPOINT.BUNDLE, stored.error)
      }

      const signed = await signBundle({
        host: new URL(call.request.url).host,
        now: Date.now(),
        secret: env.AUTH_SECRET,
        version: body.version,
      })
      await recordFirstDelivery(credentials.key)

      return apiResponse(API_ENDPOINT.BUNDLE, HTTP_STATUS.OK, { ...stored.bundle, ...signed })
    }),

  deactivate: (call: ApiCall): Promise<Response> =>
    serve(API_ENDPOINT.DEACTIVATE, call, async ({ credentials, input: { params }, licenseKey, tier }) => {
      try {
        await polar.licenseKeys.deactivate({
          activation_id: params.activationId,
          key: credentials.key,
          organization_id: env.POLAR_ORGANIZATION_ID,
        })
      } catch (error) {
        if (error instanceof errors.ResourceNotFound) {
          return apiErrorResponse(API_ENDPOINT.DEACTIVATE, { code: API_ERROR.ACTIVATION_NOT_FOUND })
        }

        throw error
      }

      return apiResponse(API_ENDPOINT.DEACTIVATE, HTTP_STATUS.OK, { license: summary(tier, licenseKey.activations.length - ONE_SLOT) })
    }),

  license: (call: ApiCall): Promise<Response> =>
    serve(API_ENDPOINT.LICENSE, call, ({ credentials, licenseKey, tier }) =>
      apiResponse(API_ENDPOINT.LICENSE, HTTP_STATUS.OK, {
        license: summary(tier, licenseKey.activations.length),
        machines: machinesOf(licenseKey, credentials.machine),
      }),
    ),

  validate: (call: ApiCall): Promise<Response> =>
    serve(API_ENDPOINT.VALIDATE, call, ({ credentials, input: { params }, licenseKey, tier }) => {
      const machines = machinesOf(licenseKey, credentials.machine)

      if (!holdsActivation(machines, params.activationId)) {
        return apiErrorResponse(API_ENDPOINT.VALIDATE, { code: API_ERROR.ACTIVATION_NOT_FOUND })
      }

      return apiResponse(API_ENDPOINT.VALIDATE, HTTP_STATUS.OK, { license: summary(tier, machines.length) })
    }),
}
