import { FLOW_AREA, FLOW_STATUS, type Flow } from "./flows"

export const BILLING_FLOWS = [
  {
    area: FLOW_AREA.ADMIN_PAYMENTS,
    id: "orders-mirrored",
    outcome: "Polar's order webhooks keep one copy of each order in D1, and an older event never overwrites a newer one",
    reason: "No spec sends an order event other than order.paid, and none reads the copies.",
    status: FLOW_STATUS.MISSING,
  },
  {
    area: FLOW_AREA.ADMIN_PAYMENTS,
    id: "subscriptions-mirrored",
    outcome: "Polar's subscription webhooks keep one copy of each subscription in D1, and an older event never overwrites a newer one",
    reason: "No spec sends a subscription event.",
    status: FLOW_STATUS.MISSING,
  },
] as const satisfies readonly Flow[]
