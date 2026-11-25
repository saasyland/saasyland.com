import type { QueryClient } from "@tanstack/react-query"

import { AUTH_PROVIDER } from "~/src/integrations/better-auth/auth.constants"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"

import { DEFAULT_TIME_RANGE, pointsOf, timeSeries } from "~/src/modules/_core/utils/time-series"
import { listAccountsQuery } from "~/src/modules/account/use-cases/list-accounts"
import type { BusinessProfile } from "~/src/modules/business-profile/business-profile.types"
import { businessProfileQuery } from "~/src/modules/business-profile/use-cases/get-business-profile"
import { getActiveSessionsQuery } from "~/src/modules/session/use-cases/get-active-sessions"
import { userSignupsQuery } from "~/src/modules/user/use-cases/get-user-signups"
import { getUsersPageQuery, getUsersQuery } from "~/src/modules/user/use-cases/get-users"
import type { User } from "~/src/modules/user/user.types"

import { ADMIN_DASHBOARD_PREVIEW_PAGINATION } from "~/src/data/admin"

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

export const adminBusinessProfile = (overrides: Partial<BusinessProfile["detail"]> = {}): BusinessProfile["detail"] => ({
  address: "1 Example Street\n00-001 Warsaw",
  logo: null,
  name: "Example Ltd",
  supportEmail: "support@example.test",
  ...overrides,
})

export const seedAuthQueries = (queryClient: QueryClient): void => {
  queryClient.setQueryData(businessProfileQuery.queryKey, adminBusinessProfile())
  queryClient.setQueryData(getUsersQuery.queryKey, { pendingVerification: 0, rows: [adminUser()], total: 1 })
  queryClient.setQueryData(getUsersPageQuery({ pageSize: ADMIN_DASHBOARD_PREVIEW_PAGINATION.pageSize }).queryKey, {
    pendingVerification: 0,
    rows: [adminUser()],
    total: 1,
  })
  queryClient.setQueryData(getActiveSessionsQuery.queryKey, [])
  queryClient.setQueryData(listAccountsQuery.queryKey, [
    { createdAt: fixtureDate, id: "ada-credential", providerId: AUTH_PROVIDER.CREDENTIAL },
  ])
  const series = timeSeries(DEFAULT_TIME_RANGE, fixtureDate)
  queryClient.setQueryData(userSignupsQuery().queryKey, { bucket: series.bucket, points: pointsOf(series, new Map()), total: 0 })
}
