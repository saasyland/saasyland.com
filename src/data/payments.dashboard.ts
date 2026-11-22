import { lazyRouteComponent } from "@tanstack/react-router"

import { revenueQuery } from "~/src/modules/order/use-cases/get-revenue"

import { type AdminDashboardPanel, DASHBOARD_PLACEMENT } from "~/src/data/dashboard.constants"

import { RevenueChartPending } from "~/src/presentation/components/custom/admin/payments/revenue-chart-pending"

const AREA = "payments"

export const PAYMENTS_DASHBOARD = [
  {
    Panel: lazyRouteComponent(() => import("~/src/presentation/components/custom/admin/payments/revenue-chart"), "RevenueChart"),
    Pending: RevenueChartPending,
    area: AREA,
    key: "revenue",
    order: 10,
    placement: DASHBOARD_PLACEMENT.PANEL,
    prefetch: (queryClient) => queryClient.query({ ...revenueQuery(), staleTime: "static" }),
  },
] as const satisfies readonly AdminDashboardPanel[]
