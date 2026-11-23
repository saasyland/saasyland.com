import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { and, desc, eq, isNull } from "drizzle-orm"
import { alias } from "drizzle-orm/sqlite-core"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { INVITATION_QUERY_KEYS } from "~/src/modules/invitation/invitation.constants"
import { invitation } from "~/src/modules/invitation/invitation.schema"
import { invitationStatus } from "~/src/modules/invitation/invitation.utils"
import { user } from "~/src/modules/user/user.schema"

export const listInvitations = createServerFn({ method: "GET" })
  .middleware([authorized({ user: ["list"] })])
  .handler(async () => {
    const inviter = alias(user, "inviter")
    const rows = await db
      .select({
        acceptedAt: invitation.acceptedAt,
        email: invitation.email,
        expiresAt: invitation.expiresAt,
        id: invitation.id,
        invitedAt: invitation.createdAt,
        invitedBy: inviter.name,
        revokedAt: invitation.revokedAt,
        role: invitation.role,
        sentAt: invitation.sentAt,
      })
      .from(invitation)
      .leftJoin(inviter, eq(inviter.id, invitation.invitedBy))
      .where(and(isNull(invitation.acceptedAt), isNull(invitation.revokedAt)))
      .orderBy(desc(invitation.createdAt))
    const now = new Date()

    return rows.map(({ acceptedAt, email, expiresAt, id, invitedAt, invitedBy, revokedAt, role, sentAt }) => ({
      email,
      expiresAt,
      id,
      invitedAt,
      invitedBy,
      role,
      sentAt,
      status: invitationStatus({ acceptedAt, expiresAt, revokedAt }, now),
    }))
  })

export const listInvitationsQuery = queryOptions({ queryFn: () => listInvitations(), queryKey: INVITATION_QUERY_KEYS.LIST })
