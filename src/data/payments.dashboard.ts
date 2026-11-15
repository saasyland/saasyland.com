import { type AdminDashboardPanel, DASHBOARD_PLACEMENT } from "~/src/data/dashboard.constants"

import { RevenueChart, RevenueChartPending } from "~/src/presentation/components/custom/admin/payments/revenue-chart"

const AREA = "payments"

export const PAYMENTS_DASHBOARD = [
  { Panel: RevenueChart, Pending: RevenueChartPending, area: AREA, key: "revenue", order: 10, placement: DASHBOARD_PLACEMENT.PANEL },
] as const satisfies readonly AdminDashboardPanel[]
