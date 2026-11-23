import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"

import { withRequest } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { INVITATION_QUERY_KEYS } from "~/src/modules/invitation/invitation.constants"
import { invitation } from "~/src/modules/invitation/invitation.schema"
import type { Invitation } from "~/src/modules/invitation/invitation.types"
import { invitationStatus } from "~/src/modules/invitation/invitation.utils"
import { invitationZodSchemas } from "~/src/modules/invitation/invitation.zod"

import { sha256Hex } from "~/src/lib/hex"

export const getInvitation = createServerFn({ method: "GET" })
  .middleware([withRequest])
  .validator((input: Invitation["getInvitation"]) => invitationZodSchemas.getInvitation.parse(input))
  .handler(async ({ data }) => {
    const [row] = await db
      .select({
        acceptedAt: invitation.acceptedAt,
        email: invitation.email,
        expiresAt: invitation.expiresAt,
        revokedAt: invitation.revokedAt,
        role: invitation.role,
      })
      .from(invitation)
      .where(eq(invitation.tokenHash, await sha256Hex(data.token)))
    if (row === undefined) {
      return { invitation: undefined }
    }

    return { invitation: { email: row.email, role: row.role, status: invitationStatus(row, new Date()) } }
  })

export const invitationQuery = (data: Invitation["getInvitation"]) =>
  queryOptions({ queryFn: () => getInvitation({ data }), queryKey: [...INVITATION_QUERY_KEYS.DETAIL, data.token] })
