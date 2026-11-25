import type { JSX } from "react"

import type { QueryClient } from "@tanstack/react-query"

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
  readonly Pending: () => JSX.Element
  readonly prefetch: (queryClient: QueryClient) => Promise<unknown>
}

export const DASHBOARD_PANELS = [
  {
    Pending: UnlicensedOrdersPending,
    key: "unlicensedOrders",
    prefetch: (queryClient) => queryClient.query({ ...unlicensedOrdersQuery, staleTime: "static" }),
  },
  {
    Pending: LicenseCountsPending,
    key: "licenses",
    prefetch: (queryClient) => queryClient.query({ ...licenseCountsQuery, staleTime: "static" }),
  },
  {
    Pending: RevenueChartPending,
    key: "revenue",
    prefetch: (queryClient) => queryClient.query({ ...revenueQuery(), staleTime: "static" }),
  },
  {
    Pending: SignupsChartPending,
    key: "signups",
    prefetch: (queryClient) => queryClient.query({ ...userSignupsQuery(), staleTime: "static" }),
  },
  {
    Pending: CourseProgressPending,
    key: "progress",
    prefetch: (queryClient) => queryClient.query({ ...courseProgressQuery, staleTime: "static" }),
  },
] as const satisfies readonly DashboardPanel[]

export type DashboardPanelKey = (typeof DASHBOARD_PANELS)[number]["key"]

export const DashboardPanelsPending = (): JSX.Element => (
  <>
    {DASHBOARD_PANELS.map(({ Pending, key }) => (
      <Pending key={key} />
    ))}
  </>
)
