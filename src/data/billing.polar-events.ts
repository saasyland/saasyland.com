import { POLAR_WEBHOOK_EVENT } from "~/src/integrations/polar/polar.constants"

import type { PolarEventHandler } from "~/src/data/polar-events"

export const BILLING_POLAR_EVENTS = [
  {
    events: [
      POLAR_WEBHOOK_EVENT.ORDER_CREATED,
      POLAR_WEBHOOK_EVENT.ORDER_PAID,
      POLAR_WEBHOOK_EVENT.ORDER_REFUNDED,
      POLAR_WEBHOOK_EVENT.ORDER_UPDATED,
    ],
    handle: async (event) => {
      if (
        event.type === POLAR_WEBHOOK_EVENT.ORDER_CREATED ||
        event.type === POLAR_WEBHOOK_EVENT.ORDER_PAID ||
        event.type === POLAR_WEBHOOK_EVENT.ORDER_REFUNDED ||
        event.type === POLAR_WEBHOOK_EVENT.ORDER_UPDATED
      ) {
        const { recordOrder } = await import("~/src/modules/order/use-cases/record-order")
        await recordOrder(event.data)
      }
    },
  },
  {
    events: [POLAR_WEBHOOK_EVENT.SUBSCRIPTION_CREATED, POLAR_WEBHOOK_EVENT.SUBSCRIPTION_UPDATED],
    handle: async (event) => {
      if (event.type === POLAR_WEBHOOK_EVENT.SUBSCRIPTION_CREATED || event.type === POLAR_WEBHOOK_EVENT.SUBSCRIPTION_UPDATED) {
        const { recordSubscription } = await import("~/src/modules/subscription/use-cases/record-subscription")
        await recordSubscription(event.data)
      }
    },
  },
] as const satisfies readonly PolarEventHandler[]
