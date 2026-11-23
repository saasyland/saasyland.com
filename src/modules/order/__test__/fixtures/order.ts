import { JSON_NULL } from "~/src/platform/testing/lib/json-null"

import { POLAR_ORDER_STATUS } from "~/src/integrations/polar/polar.constants"

import type { Order } from "~/src/modules/order/order.types"

import { DEFAULT_CURRENCY_CODE } from "~/src/data/pricing"

export const orderRow = (overrides: Partial<Order["insert"]> = {}): Order["insert"] => ({
  changedAt: new Date("2026-11-16T10:05:00.000Z"),
  currency: DEFAULT_CURRENCY_CODE.toLowerCase(),
  customerId: crypto.randomUUID(),
  description: "Complete",
  id: crypto.randomUUID(),
  invoiceNumber: "SAASY-0001",
  placedAt: new Date("2026-11-16T10:00:00.000Z"),
  productId: crypto.randomUUID(),
  refundedAmount: 0,
  status: POLAR_ORDER_STATUS.PAID,
  subscriptionId: JSON_NULL,
  totalAmount: 19_900,
  userId: JSON_NULL,
  ...overrides,
})
