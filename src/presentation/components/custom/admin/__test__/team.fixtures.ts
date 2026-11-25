import type { QueryClient } from "@tanstack/react-query"

import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"

import { INVITATION_STATUS } from "~/src/modules/invitation/invitation.constants"
import type { Invitation } from "~/src/modules/invitation/invitation.types"
import { invitationExpiry } from "~/src/modules/invitation/invitation.utils"
import { listInvitationsQuery } from "~/src/modules/invitation/use-cases/list-invitations"

import { fixtureDate } from "~/src/presentation/components/custom/admin/__test__/fixture-date"

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

export const seedTeamQueries = (queryClient: QueryClient): void => {
  queryClient.setQueryData(listInvitationsQuery.queryKey, [])
}
