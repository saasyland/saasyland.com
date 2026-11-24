import type { webhooks } from "@polar-sh/sdk/2026-10"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { JSON_NULL } from "~/src/platform/testing/lib/json-null"
import { POLAR_API_VERSION, type PolarProduct, polarCustomer, polarOrder } from "~/src/platform/testing/lib/polar"
import { createPolarOrder, grantPolarLicenseKey } from "~/src/platform/testing/mocks/polar"

import { POLAR_ORDER_STATUS, POLAR_RECURRING_INTERVAL, POLAR_WEBHOOK_EVENT } from "~/src/integrations/polar/polar.constants"
import { POLAR_EVENTS, POLAR_EVENT_HANDLERS, handlePolarEvent } from "~/src/integrations/polar/polar.webhooks"

import { LICENSE_TIER, LICENSE_WEBHOOK_EVENTS } from "~/src/modules/license/license.constants"
import { POLAR_PRODUCT_IDS } from "~/src/modules/license/license.utils"
import type { licenseWebhookHandlers } from "~/src/modules/license/license.webhooks"
import type { recordOrder } from "~/src/modules/order/use-cases/record-order"
import type { recordSubscription } from "~/src/modules/subscription/use-cases/record-subscription"

import { DEFAULT_CURRENCY_CODE } from "~/src/data/pricing"

const recorders = vi.hoisted(() => ({
  recordOrder: vi.fn<typeof recordOrder>(),
  recordSubscription: vi.fn<typeof recordSubscription>(),
}))

const handlers = vi.hoisted(() => ({
  onBenefitGrantCreated: vi.fn<(typeof licenseWebhookHandlers)["onBenefitGrantCreated"]>(),
  onBenefitGrantRevoked: vi.fn<(typeof licenseWebhookHandlers)["onBenefitGrantRevoked"]>(),
  onOrderPaid: vi.fn<(typeof licenseWebhookHandlers)["onOrderPaid"]>(),
  onOrderRefunded: vi.fn<(typeof licenseWebhookHandlers)["onOrderRefunded"]>(),
}))

vi.mock(import("~/src/modules/order/use-cases/record-order"), () => ({ recordOrder: recorders.recordOrder }))
vi.mock(import("~/src/modules/subscription/use-cases/record-subscription"), () => ({ recordSubscription: recorders.recordSubscription }))
vi.mock(import("~/src/modules/license/license.webhooks"), () => ({ licenseWebhookHandlers: handlers }))

const PRODUCT = {
  id: "product-billing",
  name: "Billing",
  price: { amount: 1500, currency: DEFAULT_CURRENCY_CODE },
  recurringInterval: POLAR_RECURRING_INTERVAL.YEAR,
} as const satisfies PolarProduct

const ORDER = polarOrder({
  checkoutId: JSON_NULL,
  customer: polarCustomer("organization-billing", "billing-customer"),
  metadata: {},
  product: PRODUCT,
  status: POLAR_ORDER_STATUS.PAID,
})

const SENT = { api_version: POLAR_API_VERSION, timestamp: "2026-11-16T12:00:00.000Z" }

const PAID: webhooks.WebhookPayload = { ...SENT, data: ORDER, type: POLAR_WEBHOOK_EVENT.ORDER_PAID }

const [ORDERS, , LICENSE_EVENTS] = POLAR_EVENT_HANDLERS

const deliveries = () => {
  const order = createPolarOrder({ externalCustomerId: "license-buyer", productId: POLAR_PRODUCT_IDS[LICENSE_TIER.CORE] })
  const grant = grantPolarLicenseKey(order)

  return [
    { event: { ...SENT, data: grant, type: LICENSE_WEBHOOK_EVENTS.onBenefitGrantCreated }, handler: handlers.onBenefitGrantCreated },
    { event: { ...SENT, data: grant, type: LICENSE_WEBHOOK_EVENTS.onBenefitGrantRevoked }, handler: handlers.onBenefitGrantRevoked },
    { event: { ...SENT, data: order, type: LICENSE_WEBHOOK_EVENTS.onOrderPaid }, handler: handlers.onOrderPaid },
    { event: { ...SENT, data: order, type: LICENSE_WEBHOOK_EVENTS.onOrderRefunded }, handler: handlers.onOrderRefunded },
  ] as const
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("the licence's Polar events", () => {
  it("subscribes Polar to the licence's events and to those of the order and subscription copies", () => {
    expect(POLAR_EVENTS).toStrictEqual([
      LICENSE_WEBHOOK_EVENTS.onBenefitGrantCreated,
      LICENSE_WEBHOOK_EVENTS.onBenefitGrantRevoked,
      POLAR_WEBHOOK_EVENT.ORDER_CREATED,
      POLAR_WEBHOOK_EVENT.ORDER_PAID,
      POLAR_WEBHOOK_EVENT.ORDER_REFUNDED,
      POLAR_WEBHOOK_EVENT.ORDER_UPDATED,
      POLAR_WEBHOOK_EVENT.SUBSCRIPTION_CREATED,
      POLAR_WEBHOOK_EVENT.SUBSCRIPTION_UPDATED,
    ])
  })

  it("listens to exactly the events the licence webhook handlers handle", () => {
    expect(LICENSE_EVENTS.events).toStrictEqual(Object.values(LICENSE_WEBHOOK_EVENTS))
    expect(deliveries().map(({ event }) => event.type)).toStrictEqual(LICENSE_EVENTS.events)
  })

  it("hands each event to its own handler and to no other", async () => {
    for (const { event, handler } of deliveries()) {
      vi.clearAllMocks()

      await LICENSE_EVENTS.handle(event)

      expect(handler).toHaveBeenCalledExactlyOnceWith(event)
      expect(Object.values(handlers).filter(({ mock }) => mock.calls.length > 0)).toStrictEqual([handler])
    }
  })

  it("hands a payment to the licence and to the copy of the order, and to no subscription", async () => {
    expect(ORDERS.events).toStrictEqual(
      expect.arrayContaining([LICENSE_WEBHOOK_EVENTS.onOrderPaid, LICENSE_WEBHOOK_EVENTS.onOrderRefunded]),
    )

    await handlePolarEvent(PAID)

    expect(recorders.recordOrder).toHaveBeenCalledExactlyOnceWith(ORDER)
    expect(handlers.onOrderPaid).toHaveBeenCalledExactlyOnceWith(PAID)
    expect(recorders.recordSubscription).not.toHaveBeenCalled()
  })

  it("runs the licence and the copy in parallel and waits for both", async () => {
    const slow = Promise.withResolvers<undefined>()
    recorders.recordOrder.mockReturnValueOnce(slow.promise)

    const settled = vi.fn<() => void>()
    const dispatch = handlePolarEvent(PAID).then(settled)
    await vi.waitFor(() => {
      expect(handlers.onOrderPaid).toHaveBeenCalledExactlyOnceWith(PAID)
    })

    expect(settled).not.toHaveBeenCalled()

    slow.resolve(undefined)
    await dispatch

    expect(settled).toHaveBeenCalledOnce()
  })

  it("waits for both before it rejects with every failure, so the plugin answers 500 and Polar retries", async () => {
    const mirror = new Error("mirror unavailable")
    const licence = new Error("licence store unavailable")
    const slow = Promise.withResolvers<undefined>()
    recorders.recordOrder.mockRejectedValueOnce(mirror)
    handlers.onOrderPaid.mockReturnValueOnce(slow.promise)

    const rejected = vi.fn<(error: unknown) => void>()
    const dispatch = handlePolarEvent(PAID).catch(rejected)
    await vi.waitFor(() => {
      expect(handlers.onOrderPaid).toHaveBeenCalledExactlyOnceWith(PAID)
    })

    expect(rejected).not.toHaveBeenCalled()

    slow.reject(licence)
    await dispatch

    expect(rejected).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ errors: [mirror, licence], message: `2 of 2 handlers failed on ${POLAR_WEBHOOK_EVENT.ORDER_PAID}` }),
    )
    expect(rejected.mock.calls[0]?.[0]).toBeInstanceOf(AggregateError)
  })
})
