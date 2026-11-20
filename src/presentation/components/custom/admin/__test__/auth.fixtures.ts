import type { QueryClient } from "@tanstack/react-query"

import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"

import { DEFAULT_TIME_RANGE, pointsOf, timeSeries } from "~/src/modules/_core/utils/time-series"
import { getActiveSessionsQuery } from "~/src/modules/session/use-cases/get-active-sessions"
import { userSignupsQuery } from "~/src/modules/user/use-cases/get-user-signups"
import { getUsersQuery } from "~/src/modules/user/use-cases/get-users"
import type { User } from "~/src/modules/user/user.types"

import { fixtureDate } from "~/src/presentation/components/custom/admin/__test__/fixture-date"

export const adminUser = (overrides: Partial<User["select"]> = {}): User["select"] => ({
  banExpires: null,
  banReason: null,
  banned: false,
  createdAt: fixtureDate,
  email: "ada@example.com",
  emailVerified: true,
  id: "ada",
  image: null,
  name: "Ada Lovelace",
  role: ROLE_CODES.CUSTOMER,
  timezone: "Europe/Warsaw",
  twoFactorEnabled: false,
  updatedAt: fixtureDate,
  ...overrides,
})

export const seedAuthQueries = (queryClient: QueryClient): void => {
  queryClient.setQueryData(getUsersQuery.queryKey, { pendingVerification: 0, rows: [adminUser()], total: 1 })
  queryClient.setQueryData(getActiveSessionsQuery.queryKey, [])
  const series = timeSeries(DEFAULT_TIME_RANGE, fixtureDate)
  queryClient.setQueryData(userSignupsQuery().queryKey, { bucket: series.bucket, points: pointsOf(series, new Map()), total: 0 })
}
