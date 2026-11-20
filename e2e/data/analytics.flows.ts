import { FLOW_AREA, FLOW_STATUS, type Flow } from "./flows"

export const ANALYTICS_FLOWS = [
  {
    area: FLOW_AREA.ADMIN_PAYMENTS,
    id: "admin-revenue",
    outcome: "/admin/analytics and the dashboard's revenue chart show the revenue and the sales of the real orders",
    reason: "Both show sample figures.",
    status: FLOW_STATUS.TO_BUILD,
  },
] as const satisfies readonly Flow[]
