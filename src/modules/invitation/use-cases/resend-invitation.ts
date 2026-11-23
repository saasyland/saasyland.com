import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { and, eq, isNull } from "drizzle-orm"

import { authorized, withRateLimit } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { INVITATION_MUTATION_KEYS, INVITATION_RATE_LIMIT } from "~/src/modules/invitation/invitation.constants"
import { invitation } from "~/src/modules/invitation/invitation.schema"
import type { Invitation } from "~/src/modules/invitation/invitation.types"
import { invitationExpiry, issueInvitationToken } from "~/src/modules/invitation/invitation.utils"
import { invitationZodSchemas } from "~/src/modules/invitation/invitation.zod"
import { sendInvitationEmail } from "~/src/modules/invitation/use-cases/send-invitation-email"

export const resendInvitation = createServerFn({ method: "POST" })
  .middleware([withRateLimit("resend-invitation", INVITATION_RATE_LIMIT), authorized({ user: ["create"] })])
  .validator((input: Invitation["resendInvitation"]) => invitationZodSchemas.resendInvitation.parse(input))
  .handler(async ({ context, data }) => {
    const isOpen = and(eq(invitation.id, data.id), isNull(invitation.acceptedAt), isNull(invitation.revokedAt))
    const [open] = await db
      .select({ email: invitation.email, locale: invitation.locale, role: invitation.role })
      .from(invitation)
      .where(isOpen)
    if (open === undefined) {
      throw new AppError(ERROR_CODES.NOT_FOUND)
    }

    const { token, tokenHash } = await issueInvitationToken()
    await sendInvitationEmail({ ...open, inviter: context.auth.user.name, token })
    const sentAt = new Date()
    await db
      .update(invitation)
      .set({ expiresAt: invitationExpiry(sentAt), sentAt, tokenHash })
      .where(isOpen)

    return { email: open.email }
  })

export const resendInvitationMutation = mutationOptions({
  mutationFn: (data: Invitation["resendInvitation"]) => resendInvitation({ data }),
  mutationKey: INVITATION_MUTATION_KEYS.RESEND,
})
