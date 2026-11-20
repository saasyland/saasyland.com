import { useSuspenseQuery } from "@tanstack/react-query"

import { userSignupsQuery } from "~/src/modules/user/use-cases/get-user-signups"
import { getUsersQuery } from "~/src/modules/user/use-cases/get-users"

import { type AdminDashboardEntry, DASHBOARD_PLACEMENT } from "~/src/data/dashboard.constants"

import { SignupsChart, SignupsChartPending } from "~/src/presentation/components/custom/admin/dashboard/signups-chart"

const AREA = "auth"

export const AUTH_DASHBOARD = [
  {
    area: AREA,
    key: "registeredUsers",
    order: 10,
    placement: DASHBOARD_PLACEMENT.STAT,
    prefetch: (queryClient) => queryClient.query({ ...getUsersQuery, staleTime: "static" }),
    useValue: () => useSuspenseQuery(getUsersQuery).data.total,
  },
  {
    area: AREA,
    key: "pendingVerification",
    order: 30,
    placement: DASHBOARD_PLACEMENT.STAT,
    prefetch: (queryClient) => queryClient.query({ ...getUsersQuery, staleTime: "static" }),
    useValue: () => useSuspenseQuery(getUsersQuery).data.pendingVerification,
  },
  {
    Panel: SignupsChart,
    Pending: SignupsChartPending,
    area: AREA,
    key: "signups",
    order: 20,
    placement: DASHBOARD_PLACEMENT.PANEL,
    prefetch: (queryClient) => queryClient.query({ ...userSignupsQuery(), staleTime: "static" }),
  },
] as const satisfies readonly AdminDashboardEntry[]
