import { setTimeout as delay } from "node:timers/promises"

import { PolarRateLimitError } from "@polar-sh/sdk"
import { createPolarCore, type models } from "@polar-sh/sdk/2026-10"
import { createBenefitGrantsService } from "@polar-sh/sdk/2026-10/services/benefit_grants"
import { createLicenseKeysService } from "@polar-sh/sdk/2026-10/services/license_keys"
import { createOrdersService } from "@polar-sh/sdk/2026-10/services/orders"
import { createRefundsService } from "@polar-sh/sdk/2026-10/services/refunds"
import * as zod from "zod"

import { POLAR_ORDER_STATUS } from "../../src/integrations/polar/polar.constants"
import { POLAR_SERVER } from "../../src/data/polar"
import { MILLISECONDS_PER_SECOND } from "../../src/lib/duration"
import { JOURNEY_SETTINGS } from "./settings"

const REFUND_REASON: models.RefundCreate["reason"] = "customer_request"
const RATE_LIMIT_PAUSE_SECONDS = 1
const LONGEST_RATE_LIMIT_PAUSE_SECONDS = 60

const polar = createPolarCore({ accessToken: JOURNEY_SETTINGS.POLAR_ACCESS_TOKEN, environment: POLAR_SERVER.SANDBOX })
const benefitGrants = createBenefitGrantsService(polar)
const licenseKeys = createLicenseKeysService(polar)
const orders = createOrdersService(polar)
const refunds = createRefundsService(polar)

const licenseKeyGrantSchema = zod.object({ license_key_id: zod.string() })

export type OrderLicenseKey = Pick<models.LicenseKeyRead, "id" | "limit_activations" | "status">

const withinRateLimit = async <Result>(request: () => Promise<Result>): Promise<Result> => {
  try {
    return await request()
  } catch (error) {
    const pause = error instanceof PolarRateLimitError ? (error.retryAfter ?? RATE_LIMIT_PAUSE_SECONDS) : Number.POSITIVE_INFINITY

    if (pause > LONGEST_RATE_LIMIT_PAUSE_SECONDS) {
      throw error
    }

    await delay(pause * MILLISECONDS_PER_SECOND)

    return withinRateLimit(request)
  }
}

export const accountOrders = async (userId: string): Promise<models.Order[]> =>
  withinRateLimit(async () => Array.fromAsync(orders.iterList({ external_customer_id: userId })))

export const orderLicenseKey = async (userId: string, orderId: string): Promise<OrderLicenseKey> => {
  const grants = await withinRateLimit(async () => Array.fromAsync(benefitGrants.iterList({ external_customer_id: userId })))
  const grant = grants.find(({ order_id: grantOrderId }) => grantOrderId === orderId)
  const { license_key_id: licenseKeyId } = licenseKeyGrantSchema.parse(grant?.properties)
  const { id, limit_activations: limitActivations, status } = await withinRateLimit(async () => licenseKeys.get(licenseKeyId))

  return { id, limit_activations: limitActivations, status }
}

export const refundOrder = async ({ id, net_amount: netAmount, refunded_amount: refundedAmount }: models.Order): Promise<void> => {
  await withinRateLimit(async () =>
    refunds.create({ amount: netAmount - refundedAmount, order_id: id, reason: REFUND_REASON, revoke_benefits: true }),
  )
}

export const refundPaidOrders = async (userId: string): Promise<void> => {
  const paid = (await accountOrders(userId)).filter(({ status }) => status === POLAR_ORDER_STATUS.PAID)

  await Promise.all(paid.map(async (order) => refundOrder(order)))
}
