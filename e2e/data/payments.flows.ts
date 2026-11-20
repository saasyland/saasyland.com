import { FLOW_AREA, FLOW_STATUS, type Flow } from "./flows"

export const PAYMENTS_FLOWS = [
  {
    area: FLOW_AREA.ADMIN_PAYMENTS,
    id: "admin-payments-list",
    outcome: "/admin/payments lists the real orders and refunds",
    reason: "The page shows the sample rows of src/data/admin-payments.ts.",
    status: FLOW_STATUS.TO_BUILD,
  },
  {
    area: FLOW_AREA.ADMIN_PAYMENTS,
    id: "admin-refund-order",
    outcome: "The admin refunds an order from /admin/payments, and its licence is marked refunded",
    reason: "Refunds are made in Polar's dashboard; the page has no refund action.",
    status: FLOW_STATUS.TO_BUILD,
  },
] as const satisfies readonly Flow[]
