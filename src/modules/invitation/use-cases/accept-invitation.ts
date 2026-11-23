import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { RATE_LIMITS, withRateLimit } from "~/src/integrations/better-auth/auth.middleware"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { INVITATION_MUTATION_KEYS } from "~/src/modules/invitation/invitation.constants"
import { invitation } from "~/src/modules/invitation/invitation.schema"
import type { Invitation } from "~/src/modules/invitation/invitation.types"
import { openInvitation } from "~/src/modules/invitation/invitation.utils"
import { invitationZodSchemas } from "~/src/modules/invitation/invitation.zod"

import { sha256Hex } from "~/src/lib/hex"

export const acceptInvitation = createServerFn({ method: "POST" })
  .middleware([withRateLimit("accept-invitation", RATE_LIMITS.TOKEN)])
  .validator((input: Invitation["acceptInvitation"]) => invitationZodSchemas.acceptInvitation.parse(input))
  .handler(async ({ context, data }) => {
    const open = await db
      .select({ id: invitation.id })
      .from(invitation)
      .where(openInvitation(await sha256Hex(data.token), new Date()))
    if (open.length === 0) {
      throw new AppError(ERROR_CODES.NOT_FOUND)
    }

    return auth.api.acceptInvitation({ body: data, headers: context.requestHeaders })
  })

export const acceptInvitationMutation = mutationOptions({
  mutationFn: (data: Invitation["acceptInvitation"]) => acceptInvitation({ data }),
  mutationKey: INVITATION_MUTATION_KEYS.ACCEPT,
})
