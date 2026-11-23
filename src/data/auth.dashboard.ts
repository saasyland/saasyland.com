import { useSuspenseQuery } from "@tanstack/react-query"
import { lazyRouteComponent } from "@tanstack/react-router"
import { MailQuestion, UsersRound } from "lucide-react"

import { userSignupsQuery } from "~/src/modules/user/use-cases/get-user-signups"
import { getUsersQuery } from "~/src/modules/user/use-cases/get-users"

import { type AdminDashboardEntry, DASHBOARD_PLACEMENT } from "~/src/data/dashboard.constants"

import { SignupsChartPending } from "~/src/presentation/components/custom/admin/dashboard/signups-chart-pending"

import * as ROUTES from "~/src/routes"

const AREA = "auth"

export const AUTH_DASHBOARD = [
  {
    area: AREA,
    icon: UsersRound,
    key: "registeredUsers",
    order: 10,
    placement: DASHBOARD_PLACEMENT.STAT,
    prefetch: (queryClient) => queryClient.query({ ...getUsersQuery, staleTime: "static" }),
    to: ROUTES.ADMIN_USERS_ALL,
    useValue: () => useSuspenseQuery(getUsersQuery).data.total,
  },
  {
    area: AREA,
    icon: MailQuestion,
    key: "pendingVerification",
    order: 30,
    placement: DASHBOARD_PLACEMENT.STAT,
    prefetch: (queryClient) => queryClient.query({ ...getUsersQuery, staleTime: "static" }),
    to: ROUTES.ADMIN_USERS_ALL,
    useValue: () => useSuspenseQuery(getUsersQuery).data.pendingVerification,
  },
  {
    Panel: lazyRouteComponent(() => import("~/src/presentation/components/custom/admin/dashboard/signups-chart"), "SignupsChart"),
    Pending: SignupsChartPending,
    area: AREA,
    key: "signups",
    order: 20,
    placement: DASHBOARD_PLACEMENT.PANEL,
    prefetch: (queryClient) => queryClient.query({ ...userSignupsQuery(), staleTime: "static" }),
  },
] as const satisfies readonly AdminDashboardEntry[]
