import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { and, eq } from "drizzle-orm"

import { RATE_LIMITS, authorized, withRateLimit } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { INVITATION_MUTATION_KEYS } from "~/src/modules/invitation/invitation.constants"
import { invitation } from "~/src/modules/invitation/invitation.schema"
import type { Invitation } from "~/src/modules/invitation/invitation.types"
import { openInvitation } from "~/src/modules/invitation/invitation.utils"
import { invitationZodSchemas } from "~/src/modules/invitation/invitation.zod"
import { user } from "~/src/modules/user/user.schema"

import { sha256Hex } from "~/src/lib/hex"

export const claimInvitation = createServerFn({ method: "POST" })
  .middleware([withRateLimit("claim-invitation", RATE_LIMITS.TOKEN), authorized()])
  .validator((input: Invitation["claimInvitation"]) => invitationZodSchemas.claimInvitation.parse(input))
  .handler(async ({ context, data }) => {
    const acceptedAt = new Date()
    const tokenHash = await sha256Hex(data.token)
    const email = context.auth.user.email.toLowerCase()
    const [claimed] = await db
      .update(invitation)
      .set({ acceptedAt, acceptedBy: context.auth.user.id })
      .where(and(openInvitation(tokenHash, acceptedAt), eq(invitation.email, email)))
      .returning({ role: invitation.role })
    if (claimed === undefined) {
      throw new AppError(ERROR_CODES.NOT_FOUND)
    }

    await db.update(user).set({ emailVerified: true, role: claimed.role }).where(eq(user.id, context.auth.user.id))

    return claimed
  })

export const claimInvitationMutation = mutationOptions({
  mutationFn: (data: Invitation["claimInvitation"]) => claimInvitation({ data }),
  mutationKey: INVITATION_MUTATION_KEYS.CLAIM,
})
