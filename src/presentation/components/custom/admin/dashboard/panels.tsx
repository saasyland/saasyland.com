import type { JSX } from "react"

import type { QueryClient } from "@tanstack/react-query"
import { type AsyncRouteComponent, lazyRouteComponent } from "@tanstack/react-router"

import { courseProgressQuery } from "~/src/modules/lesson-progress/use-cases/get-course-progress"
import { licenseCountsQuery } from "~/src/modules/license/use-cases/get-license-counts"
import { unlicensedOrdersQuery } from "~/src/modules/license/use-cases/get-unlicensed-orders"
import { revenueQuery } from "~/src/modules/order/use-cases/get-revenue"
import { userSignupsQuery } from "~/src/modules/user/use-cases/get-user-signups"

import { CourseProgressPending } from "~/src/presentation/components/custom/admin/courses/course-progress-pending"
import { SignupsChartPending } from "~/src/presentation/components/custom/admin/dashboard/signups-chart-pending"
import { LicenseCountsPending } from "~/src/presentation/components/custom/admin/license/license-counts-pending"
import { UnlicensedOrdersPending } from "~/src/presentation/components/custom/admin/license/unlicensed-orders-pending"
import { RevenueChartPending } from "~/src/presentation/components/custom/admin/payments/revenue-chart-pending"

interface DashboardPanel {
  readonly key: string
  readonly Panel: AsyncRouteComponent<unknown>
  readonly Pending: () => JSX.Element
  readonly prefetch: (queryClient: QueryClient) => Promise<unknown>
}

export const DASHBOARD_PANELS: readonly DashboardPanel[] = [
  {
    Panel: lazyRouteComponent(() => import("~/src/presentation/components/custom/admin/license/unlicensed-orders"), "UnlicensedOrders"),
    Pending: UnlicensedOrdersPending,
    key: "unlicensedOrders",
    prefetch: (queryClient) => queryClient.query({ ...unlicensedOrdersQuery, staleTime: "static" }),
  },
  {
    Panel: lazyRouteComponent(() => import("~/src/presentation/components/custom/admin/license/license-counts"), "LicenseCounts"),
    Pending: LicenseCountsPending,
    key: "licenses",
    prefetch: (queryClient) => queryClient.query({ ...licenseCountsQuery, staleTime: "static" }),
  },
  {
    Panel: lazyRouteComponent(() => import("~/src/presentation/components/custom/admin/payments/revenue-chart"), "RevenueChart"),
    Pending: RevenueChartPending,
    key: "revenue",
    prefetch: (queryClient) => queryClient.query({ ...revenueQuery(), staleTime: "static" }),
  },
  {
    Panel: lazyRouteComponent(() => import("~/src/presentation/components/custom/admin/dashboard/signups-chart"), "SignupsChart"),
    Pending: SignupsChartPending,
    key: "signups",
    prefetch: (queryClient) => queryClient.query({ ...userSignupsQuery(), staleTime: "static" }),
  },
  {
    Panel: lazyRouteComponent(() => import("~/src/presentation/components/custom/admin/courses/course-progress"), "CourseProgress"),
    Pending: CourseProgressPending,
    key: "progress",
    prefetch: (queryClient) => queryClient.query({ ...courseProgressQuery, staleTime: "static" }),
  },
]

export const DashboardPanels = (): JSX.Element => (
  <>
    {DASHBOARD_PANELS.map(({ Panel, key }) => (
      <Panel key={key} />
    ))}
  </>
)
