import { createPolarCore, type models } from "@polar-sh/sdk/2026-10"
import { createOrdersService } from "@polar-sh/sdk/2026-10/services/orders"
import { createRefundsService } from "@polar-sh/sdk/2026-10/services/refunds"

import { POLAR_SERVER } from "../../src/lib/polar"
import { JOURNEY_SETTINGS } from "./settings"

export const ORDER_STATUS = {
  PAID: "paid",
  REFUNDED: "refunded",
} as const satisfies Record<string, models.OrderStatus>

const REFUND_REASON: models.RefundCreate["reason"] = "customer_request"

const polar = createPolarCore({ accessToken: JOURNEY_SETTINGS.POLAR_ACCESS_TOKEN, environment: POLAR_SERVER.SANDBOX })
const orders = createOrdersService(polar)
const refunds = createRefundsService(polar)

export const accountOrders = async (userId: string): Promise<models.Order[]> =>
  Array.fromAsync(orders.iterList({ external_customer_id: userId }))

export const refundOrder = async ({ id, net_amount: netAmount, refunded_amount: refundedAmount }: models.Order): Promise<void> => {
  await refunds.create({ amount: netAmount - refundedAmount, order_id: id, reason: REFUND_REASON, revoke_benefits: true })
}

export const refundPaidOrders = async (userId: string): Promise<void> => {
  const paid = (await accountOrders(userId)).filter(({ status }) => status === ORDER_STATUS.PAID)

  await Promise.all(paid.map(async (order) => refundOrder(order)))
}
