import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { and, eq, isNull } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { INVITATION_MUTATION_KEYS } from "~/src/modules/invitation/invitation.constants"
import { invitation } from "~/src/modules/invitation/invitation.schema"
import type { Invitation } from "~/src/modules/invitation/invitation.types"
import { invitationZodSchemas } from "~/src/modules/invitation/invitation.zod"

export const revokeInvitation = createServerFn({ method: "POST" })
  .middleware([authorized({ user: ["create"] })])
  .validator((input: Invitation["revokeInvitation"]) => invitationZodSchemas.revokeInvitation.parse(input))
  .handler(async ({ context, data }) => {
    const [revoked] = await db
      .update(invitation)
      .set({ revokedAt: new Date(), revokedBy: context.auth.user.id })
      .where(and(eq(invitation.id, data.id), isNull(invitation.acceptedAt), isNull(invitation.revokedAt)))
      .returning({ email: invitation.email })
    if (revoked === undefined) {
      throw new AppError(ERROR_CODES.NOT_FOUND)
    }

    return revoked
  })

export const revokeInvitationMutation = mutationOptions({
  mutationFn: (data: Invitation["revokeInvitation"]) => revokeInvitation({ data }),
  mutationKey: INVITATION_MUTATION_KEYS.REVOKE,
})
