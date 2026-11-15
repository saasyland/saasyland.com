import { LICENSE_WEBHOOK_EVENTS } from "~/src/modules/license/license.constants"

import type { PolarEventHandler } from "~/src/data/polar-events"

export const LICENSE_POLAR_EVENTS = [
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
