import { describe, expect, it, vi } from "vite-plus/test"

import { POLAR_API_VERSION } from "~/src/platform/testing/lib/polar"
import { createPolarOrder, grantPolarLicenseKey } from "~/src/platform/testing/mocks/polar"

import { LICENSE_TIER, LICENSE_WEBHOOK_EVENTS } from "~/src/modules/license/license.constants"
import { POLAR_PRODUCT_IDS } from "~/src/modules/license/license.utils"
import type { licenseWebhookHandlers } from "~/src/modules/license/license.webhooks"

import { LICENSE_POLAR_EVENTS } from "~/src/data/license.polar-events"

const handlers = vi.hoisted(() => ({
  onBenefitGrantCreated: vi.fn<(typeof licenseWebhookHandlers)["onBenefitGrantCreated"]>(),
  onBenefitGrantRevoked: vi.fn<(typeof licenseWebhookHandlers)["onBenefitGrantRevoked"]>(),
  onOrderPaid: vi.fn<(typeof licenseWebhookHandlers)["onOrderPaid"]>(),
  onOrderRefunded: vi.fn<(typeof licenseWebhookHandlers)["onOrderRefunded"]>(),
}))

vi.mock(import("~/src/modules/license/license.webhooks"), () => ({ licenseWebhookHandlers: handlers }))

const SENT = { api_version: POLAR_API_VERSION, timestamp: "2026-11-15T12:00:00.000Z" }

const [LICENSE_EVENTS] = LICENSE_POLAR_EVENTS

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

describe("the licence area's Polar events", () => {
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
})
