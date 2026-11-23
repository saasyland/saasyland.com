import type { models, webhooks } from "@polar-sh/sdk/2026-10"

import { POLAR_WEBHOOK_EVENT } from "~/src/integrations/polar/polar.constants"

import type { PolarEventHandler } from "~/src/data/polar-events"

type EventOf<Events extends readonly models.WebhookEventType[]> = Extract<webhooks.WebhookPayload, { type: Events[number] }>

const ORDER_EVENTS = [
  POLAR_WEBHOOK_EVENT.ORDER_CREATED,
  POLAR_WEBHOOK_EVENT.ORDER_PAID,
  POLAR_WEBHOOK_EVENT.ORDER_REFUNDED,
  POLAR_WEBHOOK_EVENT.ORDER_UPDATED,
] as const

const SUBSCRIPTION_EVENTS = [POLAR_WEBHOOK_EVENT.SUBSCRIPTION_CREATED, POLAR_WEBHOOK_EVENT.SUBSCRIPTION_UPDATED] as const

const isOneOf = <Events extends readonly models.WebhookEventType[]>(
  events: Events,
  event: webhooks.WebhookPayload,
): event is EventOf<Events> => events.includes(event.type)

export const BILLING_POLAR_EVENTS = [
  {
    events: ORDER_EVENTS,
    handle: async (event) => {
      if (isOneOf(ORDER_EVENTS, event)) {
        const { recordOrder } = await import("~/src/modules/order/use-cases/record-order")
        await recordOrder(event.data)
      }
    },
  },
  {
    events: SUBSCRIPTION_EVENTS,
    handle: async (event) => {
      if (isOneOf(SUBSCRIPTION_EVENTS, event)) {
        const { recordSubscription } = await import("~/src/modules/subscription/use-cases/record-subscription")
        await recordSubscription(event.data)
      }
    },
  },
] as const satisfies readonly PolarEventHandler[]
