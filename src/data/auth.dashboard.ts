import { useSuspenseQuery } from "@tanstack/react-query"

import { getUsersQuery } from "~/src/modules/user/use-cases/get-users"

import type { AdminDashboardStat } from "~/src/data/dashboard"

const AREA = "auth"

export const AUTH_DASHBOARD = [
  {
    area: AREA,
    key: "activeUsers",
    order: 10,
    prefetch: (queryClient) => queryClient.query({ ...getUsersQuery, staleTime: "static" }),
    useValue: () => useSuspenseQuery(getUsersQuery).data.total,
  },
  {
    area: AREA,
    key: "pendingVerification",
    order: 30,
    prefetch: (queryClient) => queryClient.query({ ...getUsersQuery, staleTime: "static" }),
    useValue: () => useSuspenseQuery(getUsersQuery).data.pendingVerification,
  },
] as const satisfies readonly AdminDashboardStat[]
