import { unlicensedOrdersQuery } from "~/src/modules/license/use-cases/get-unlicensed-orders"

import { type AdminDashboardPanel, DASHBOARD_PLACEMENT } from "~/src/data/dashboard.constants"

import { UnlicensedOrders, UnlicensedOrdersPending } from "~/src/presentation/components/custom/admin/license/unlicensed-orders"

const AREA = "license"

export const LICENSE_DASHBOARD = [
  {
    Panel: UnlicensedOrders,
    Pending: UnlicensedOrdersPending,
    area: AREA,
    key: "unlicensedOrders",
    order: 5,
    placement: DASHBOARD_PLACEMENT.PANEL,
    prefetch: (queryClient) => queryClient.query({ ...unlicensedOrdersQuery, staleTime: "static" }),
  },
] as const satisfies readonly AdminDashboardPanel[]
