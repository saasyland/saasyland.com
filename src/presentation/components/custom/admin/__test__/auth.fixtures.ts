import type { QueryClient } from "@tanstack/react-query"

import { AUTH_PROVIDER } from "~/src/integrations/better-auth/auth.constants"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"

import { DEFAULT_TIME_RANGE, pointsOf, timeSeries } from "~/src/modules/_core/utils/time-series"
import { listAccountsQuery } from "~/src/modules/account/use-cases/list-accounts"
import { INVITATION_STATUS } from "~/src/modules/invitation/invitation.constants"
import type { Invitation } from "~/src/modules/invitation/invitation.types"
import { invitationExpiry } from "~/src/modules/invitation/invitation.utils"
import { listInvitationsQuery } from "~/src/modules/invitation/use-cases/list-invitations"
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

export const adminInvitation = (overrides: Partial<Invitation["open"]> = {}): Invitation["open"] => ({
  email: "grace@example.com",
  expiresAt: invitationExpiry(fixtureDate),
  id: "invitation-grace",
  invitedAt: fixtureDate,
  invitedBy: "Ada Lovelace",
  role: ROLE_CODES.CUSTOMER,
  sentAt: fixtureDate,
  status: INVITATION_STATUS.PENDING,
  ...overrides,
})

export const seedAuthQueries = (queryClient: QueryClient): void => {
  queryClient.setQueryData(getUsersQuery.queryKey, { pendingVerification: 0, rows: [adminUser()], total: 1 })
  queryClient.setQueryData(getActiveSessionsQuery.queryKey, [])
  queryClient.setQueryData(listAccountsQuery.queryKey, [
    { createdAt: fixtureDate, id: "ada-credential", providerId: AUTH_PROVIDER.CREDENTIAL },
  ])
  queryClient.setQueryData(listInvitationsQuery.queryKey, [])
  const series = timeSeries(DEFAULT_TIME_RANGE, fixtureDate)
  queryClient.setQueryData(userSignupsQuery().queryKey, { bucket: series.bucket, points: pointsOf(series, new Map()), total: 0 })
}
