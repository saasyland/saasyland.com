import { FLOW_AREA, FLOW_STATUS, type Flow } from "./flows"

export const PAYMENTS_FLOWS = [
  {
    area: FLOW_AREA.ADMIN_PAYMENTS,
    id: "admin-revenue",
    outcome:
      "The dashboard totals the paid orders of the last 30 days or 12 months per currency, refunds subtracted and pending orders left out",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "admin-dashboard.spec.ts", title: "the dashboard totals the seeded orders per currency, refunds subtracted, and follows the period" }],
  },
  {
    area: FLOW_AREA.ADMIN_PAYMENTS,
    id: "admin-payments-list",
    outcome: "/admin/payments lists the real orders and refunds",
    reason: "There is no payments screen; the order copies feed only the dashboard's revenue panel.",
    status: FLOW_STATUS.TO_BUILD,
  },
  {
    area: FLOW_AREA.ADMIN_PAYMENTS,
    id: "admin-refund-order",
    outcome: "The admin refunds an order from /admin/payments, and its licence is marked refunded",
    reason: "Refunds are made in Polar's dashboard; the admin has no payments screen.",
    status: FLOW_STATUS.TO_BUILD,
  },
] as const satisfies readonly Flow[]
