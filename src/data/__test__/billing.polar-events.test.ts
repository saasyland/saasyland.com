import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { JSON_NULL } from "~/src/platform/testing/lib/json-null"
import { POLAR_API_VERSION, type PolarProduct, polarCustomer, polarOrder, polarSubscription } from "~/src/platform/testing/lib/polar"

import {
  POLAR_ORDER_STATUS,
  POLAR_RECURRING_INTERVAL,
  POLAR_SUBSCRIPTION_STATUS,
  POLAR_WEBHOOK_EVENT,
} from "~/src/integrations/polar/polar.constants"

import { DEFAULT_CURRENCY_CODE } from "~/src/modules/_core/constants/pricing"
import type { recordOrder } from "~/src/modules/order/use-cases/record-order"
import type { recordSubscription } from "~/src/modules/subscription/use-cases/record-subscription"

import { BILLING_POLAR_EVENTS } from "~/src/data/billing.polar-events"

const recorders = vi.hoisted(() => ({
  recordOrder: vi.fn<typeof recordOrder>(),
  recordSubscription: vi.fn<typeof recordSubscription>(),
}))

vi.mock(import("~/src/modules/order/use-cases/record-order"), () => ({ recordOrder: recorders.recordOrder }))
vi.mock(import("~/src/modules/subscription/use-cases/record-subscription"), () => ({ recordSubscription: recorders.recordSubscription }))

const PRODUCT = {
  id: "product-billing",
  name: "Billing",
  price: { amount: 1500, currency: DEFAULT_CURRENCY_CODE },
  recurringInterval: POLAR_RECURRING_INTERVAL.YEAR,
} as const satisfies PolarProduct

const CUSTOMER = polarCustomer("organization-billing", "billing-customer")

const ORDER = polarOrder({
  checkoutId: JSON_NULL,
  customer: CUSTOMER,
  metadata: {},
  product: PRODUCT,
  status: POLAR_ORDER_STATUS.PAID,
})

const SUBSCRIPTION = polarSubscription({ customer: CUSTOMER, product: PRODUCT, status: POLAR_SUBSCRIPTION_STATUS.ACTIVE })

const SENT = { api_version: POLAR_API_VERSION, timestamp: "2026-11-16T12:00:00.000Z" }

const [ORDERS, SUBSCRIPTIONS] = BILLING_POLAR_EVENTS

beforeEach(() => {
  vi.clearAllMocks()
})

describe("the billing area's Polar events", () => {
  it("listens to the events that create or change an order or a subscription, and to the payment and the refund that the licence takes too", () => {
    expect(ORDERS.events).toStrictEqual([
      POLAR_WEBHOOK_EVENT.ORDER_CREATED,
      POLAR_WEBHOOK_EVENT.ORDER_PAID,
      POLAR_WEBHOOK_EVENT.ORDER_REFUNDED,
      POLAR_WEBHOOK_EVENT.ORDER_UPDATED,
    ])
    expect(SUBSCRIPTIONS.events).toStrictEqual([POLAR_WEBHOOK_EVENT.SUBSCRIPTION_CREATED, POLAR_WEBHOOK_EVENT.SUBSCRIPTION_UPDATED])
  })

  it.each(ORDERS.events)("records the order that %s carries", async (type) => {
    await ORDERS.handle({ ...SENT, data: ORDER, type })

    expect(recorders.recordOrder).toHaveBeenCalledExactlyOnceWith(ORDER)
    expect(recorders.recordSubscription).not.toHaveBeenCalled()
  })

  it.each(SUBSCRIPTIONS.events)("records the subscription that %s carries", async (type) => {
    await SUBSCRIPTIONS.handle({ ...SENT, data: SUBSCRIPTION, type })

    expect(recorders.recordSubscription).toHaveBeenCalledExactlyOnceWith(SUBSCRIPTION)
    expect(recorders.recordOrder).not.toHaveBeenCalled()
  })

  it("records nothing for an event that the entry does not list", async () => {
    await ORDERS.handle({ ...SENT, data: SUBSCRIPTION, type: POLAR_WEBHOOK_EVENT.SUBSCRIPTION_UPDATED })
    await SUBSCRIPTIONS.handle({ ...SENT, data: ORDER, type: POLAR_WEBHOOK_EVENT.ORDER_UPDATED })

    expect(recorders.recordOrder).not.toHaveBeenCalled()
    expect(recorders.recordSubscription).not.toHaveBeenCalled()
  })
})
