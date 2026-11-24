import { execFileSync } from "node:child_process"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { JSON_NULL } from "~/src/platform/testing/lib/json-null"
import { POLAR_API_VERSION, type PolarProduct, polarCustomer, polarOrder, polarSubscription } from "~/src/platform/testing/lib/polar"

import {
  POLAR_ORDER_STATUS,
  POLAR_RECURRING_INTERVAL,
  POLAR_SUBSCRIPTION_STATUS,
  POLAR_WEBHOOK_EVENT,
} from "~/src/integrations/polar/polar.constants"
import { POLAR_EVENTS, POLAR_EVENT_HANDLERS, handlePolarEvent } from "~/src/integrations/polar/polar.webhooks"

import { DEFAULT_CURRENCY_CODE } from "~/src/modules/_core/constants/pricing"
import { ORDER_WEBHOOK_EVENTS } from "~/src/modules/order/order.constants"
import type { recordOrder } from "~/src/modules/order/use-cases/record-order"
import { SUBSCRIPTION_WEBHOOK_EVENTS } from "~/src/modules/subscription/subscription.constants"
import type { recordSubscription } from "~/src/modules/subscription/use-cases/record-subscription"

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

const [ORDERS, SUBSCRIPTIONS] = POLAR_EVENT_HANDLERS

beforeEach(() => {
  vi.clearAllMocks()
})

describe("Polar event dispatch", () => {
  it("subscribes to every event a handler lists, each once and in order", () => {
    expect(POLAR_EVENTS).toStrictEqual(POLAR_EVENTS.toSorted())
    expect(new Set(POLAR_EVENTS).size).toBe(POLAR_EVENTS.length)
    expect(new Set(POLAR_EVENTS)).toStrictEqual(new Set(POLAR_EVENT_HANDLERS.flatMap(({ events }) => events)))
  })

  it("hands an event only to the handlers that list it", async () => {
    await handlePolarEvent({ ...SENT, data: SUBSCRIPTION, type: POLAR_WEBHOOK_EVENT.SUBSCRIPTION_UPDATED })

    expect(recorders.recordSubscription).toHaveBeenCalledExactlyOnceWith(SUBSCRIPTION)
    expect(recorders.recordOrder).not.toHaveBeenCalled()

    await handlePolarEvent({ ...SENT, data: ORDER, type: POLAR_WEBHOOK_EVENT.ORDER_CREATED })

    expect(recorders.recordOrder).toHaveBeenCalledExactlyOnceWith(ORDER)
    expect(recorders.recordSubscription).toHaveBeenCalledOnce()
  })

  it("rejects with every failure, so the plugin answers 500 and Polar retries", async () => {
    const mirror = new Error("mirror unavailable")
    recorders.recordOrder.mockRejectedValueOnce(mirror)

    const rejected = vi.fn<(error: unknown) => void>()
    await handlePolarEvent({ ...SENT, data: ORDER, type: POLAR_WEBHOOK_EVENT.ORDER_UPDATED }).catch(rejected)

    expect(rejected).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ errors: [mirror], message: `1 of 1 handlers failed on ${POLAR_WEBHOOK_EVENT.ORDER_UPDATED}` }),
    )
    expect(rejected.mock.calls[0]?.[0]).toBeInstanceOf(AggregateError)
  })

  it("loads in Bun outside the Worker, where polar:verify reads the events", () => {
    const script = `const { POLAR_EVENTS } = await import("~/src/integrations/polar/polar.webhooks"); process.stdout.write(JSON.stringify(POLAR_EVENTS))`

    expect(JSON.parse(execFileSync("bun", ["--eval", script], { encoding: "utf8" }))).toStrictEqual(POLAR_EVENTS)
  })
})

describe("the copies of Polar's orders and subscriptions", () => {
  it("listens to the events that create or change an order or a subscription, and to the payment and the refund that the licence takes too", () => {
    expect(ORDERS.events).toStrictEqual(ORDER_WEBHOOK_EVENTS)
    expect(ORDER_WEBHOOK_EVENTS).toStrictEqual([
      POLAR_WEBHOOK_EVENT.ORDER_CREATED,
      POLAR_WEBHOOK_EVENT.ORDER_PAID,
      POLAR_WEBHOOK_EVENT.ORDER_REFUNDED,
      POLAR_WEBHOOK_EVENT.ORDER_UPDATED,
    ])
    expect(SUBSCRIPTIONS.events).toStrictEqual(SUBSCRIPTION_WEBHOOK_EVENTS)
    expect(SUBSCRIPTION_WEBHOOK_EVENTS).toStrictEqual([POLAR_WEBHOOK_EVENT.SUBSCRIPTION_CREATED, POLAR_WEBHOOK_EVENT.SUBSCRIPTION_UPDATED])
  })

  it.each(ORDER_WEBHOOK_EVENTS)("records the order that %s carries", async (type) => {
    await ORDERS.handle({ ...SENT, data: ORDER, type })

    expect(recorders.recordOrder).toHaveBeenCalledExactlyOnceWith(ORDER)
    expect(recorders.recordSubscription).not.toHaveBeenCalled()
  })

  it.each(SUBSCRIPTION_WEBHOOK_EVENTS)("records the subscription that %s carries", async (type) => {
    await SUBSCRIPTIONS.handle({ ...SENT, data: SUBSCRIPTION, type })

    expect(recorders.recordSubscription).toHaveBeenCalledExactlyOnceWith(SUBSCRIPTION)
    expect(recorders.recordOrder).not.toHaveBeenCalled()
  })

  it("records nothing for an event that the handler does not list", async () => {
    await ORDERS.handle({ ...SENT, data: SUBSCRIPTION, type: POLAR_WEBHOOK_EVENT.SUBSCRIPTION_UPDATED })
    await SUBSCRIPTIONS.handle({ ...SENT, data: ORDER, type: POLAR_WEBHOOK_EVENT.ORDER_UPDATED })

    expect(recorders.recordOrder).not.toHaveBeenCalled()
    expect(recorders.recordSubscription).not.toHaveBeenCalled()
  })
})
