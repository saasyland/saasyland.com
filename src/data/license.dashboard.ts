import { lazyRouteComponent } from "@tanstack/react-router"

import { licenseCountsQuery } from "~/src/modules/license/use-cases/get-license-counts"
import { unlicensedOrdersQuery } from "~/src/modules/license/use-cases/get-unlicensed-orders"

import { type AdminDashboardPanel, DASHBOARD_PLACEMENT } from "~/src/data/dashboard.constants"

import { LicenseCountsPending } from "~/src/presentation/components/custom/admin/license/license-counts-pending"
import { UnlicensedOrdersPending } from "~/src/presentation/components/custom/admin/license/unlicensed-orders-pending"

const AREA = "license"

export const LICENSE_DASHBOARD = [
  {
    Panel: lazyRouteComponent(() => import("~/src/presentation/components/custom/admin/license/unlicensed-orders"), "UnlicensedOrders"),
    Pending: UnlicensedOrdersPending,
    area: AREA,
    key: "unlicensedOrders",
    order: 5,
    placement: DASHBOARD_PLACEMENT.PANEL,
    prefetch: (queryClient) => queryClient.query({ ...unlicensedOrdersQuery, staleTime: "static" }),
  },
  {
    Panel: lazyRouteComponent(() => import("~/src/presentation/components/custom/admin/license/license-counts"), "LicenseCounts"),
    Pending: LicenseCountsPending,
    area: AREA,
    key: "licenses",
    order: 7,
    placement: DASHBOARD_PLACEMENT.PANEL,
    prefetch: (queryClient) => queryClient.query({ ...licenseCountsQuery, staleTime: "static" }),
  },
] as const satisfies readonly AdminDashboardPanel[]
