import type { models, webhooks } from "@polar-sh/sdk/2026-10"

import { LICENSE_WEBHOOK_EVENTS } from "~/src/modules/license/license.constants"
import { ORDER_WEBHOOK_EVENTS } from "~/src/modules/order/order.constants"
import { SUBSCRIPTION_WEBHOOK_EVENTS } from "~/src/modules/subscription/subscription.constants"

export interface PolarEventHandler {
  readonly events: readonly models.WebhookEventType[]
  readonly handle: (event: webhooks.WebhookPayload) => Promise<void>
}

type EventOf<Events extends readonly models.WebhookEventType[]> = Extract<webhooks.WebhookPayload, { type: Events[number] }>

const isOneOf = <Events extends readonly models.WebhookEventType[]>(
  events: Events,
  event: webhooks.WebhookPayload,
): event is EventOf<Events> => events.includes(event.type)

export const POLAR_EVENT_HANDLERS = [
  {
    events: ORDER_WEBHOOK_EVENTS,
    handle: async (event) => {
      if (isOneOf(ORDER_WEBHOOK_EVENTS, event)) {
        const { recordOrder } = await import("~/src/modules/order/use-cases/record-order")
        await recordOrder(event.data)
      }
    },
  },
  {
    events: SUBSCRIPTION_WEBHOOK_EVENTS,
    handle: async (event) => {
      if (isOneOf(SUBSCRIPTION_WEBHOOK_EVENTS, event)) {
        const { recordSubscription } = await import("~/src/modules/subscription/use-cases/record-subscription")
        await recordSubscription(event.data)
      }
    },
  },
  {
    events: Object.values(LICENSE_WEBHOOK_EVENTS),
    handle: async (event) => {
      const { licenseWebhookHandlers } = await import("~/src/modules/license/license.webhooks")

      if (event.type === LICENSE_WEBHOOK_EVENTS.onBenefitGrantCreated) {
        await licenseWebhookHandlers.onBenefitGrantCreated(event)
      }

      if (event.type === LICENSE_WEBHOOK_EVENTS.onBenefitGrantRevoked) {
        await licenseWebhookHandlers.onBenefitGrantRevoked(event)
      }

      if (event.type === LICENSE_WEBHOOK_EVENTS.onOrderPaid) {
        await licenseWebhookHandlers.onOrderPaid(event)
      }

      if (event.type === LICENSE_WEBHOOK_EVENTS.onOrderRefunded) {
        await licenseWebhookHandlers.onOrderRefunded(event)
      }
    },
  },
] as const satisfies readonly PolarEventHandler[]

export const POLAR_EVENTS = [...new Set<models.WebhookEventType>(POLAR_EVENT_HANDLERS.flatMap(({ events }) => events))].toSorted()

export const handlePolarEvent = async (event: webhooks.WebhookPayload): Promise<void> => {
  const results = await Promise.allSettled(
    POLAR_EVENT_HANDLERS.filter(({ events }: PolarEventHandler) => events.includes(event.type)).map(({ handle }) => handle(event)),
  )
  const failures = results.flatMap((result): unknown[] => (result.status === "rejected" ? [result.reason] : []))

  if (failures.length > 0) {
    throw new AggregateError(failures, `${String(failures.length)} of ${String(results.length)} handlers failed on ${event.type}`)
  }
}
