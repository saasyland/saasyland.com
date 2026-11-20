import { FLOW_AREA, FLOW_STATUS, type Flow } from "./flows"

export const ANALYTICS_FLOWS = [
  {
    area: FLOW_AREA.ADMIN_PAYMENTS,
    id: "admin-analytics",
    outcome: "An analytics screen shows page views, visitors, retention and churn",
    reason: "There is no analytics screen: the app collects no page analytics. The dashboard's revenue comes from the order copies.",
    status: FLOW_STATUS.TO_BUILD,
  },
] as const satisfies readonly Flow[]
