import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"
import { v7 } from "uuid"

import { authorized, withRateLimit } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { INVITATION_MUTATION_KEYS, INVITATION_RATE_LIMIT } from "~/src/modules/invitation/invitation.constants"
import { invitation } from "~/src/modules/invitation/invitation.schema"
import type { Invitation } from "~/src/modules/invitation/invitation.types"
import { invitationExpiry, issueInvitationToken } from "~/src/modules/invitation/invitation.utils"
import { invitationZodSchemas } from "~/src/modules/invitation/invitation.zod"
import { sendInvitationEmail } from "~/src/modules/invitation/use-cases/send-invitation-email"
import { user } from "~/src/modules/user/user.schema"

export const createInvitation = createServerFn({ method: "POST" })
  .middleware([withRateLimit("create-invitation", INVITATION_RATE_LIMIT), authorized({ user: ["create"] })])
  .validator((input: Invitation["createInvitation"]) => invitationZodSchemas.createInvitation.parse(input))
  .handler(async ({ context, data }) => {
    const email = data.email.toLowerCase()
    const accounts = await db.select({ id: user.id }).from(user).where(eq(user.email, email))
    if (accounts.length > 0) {
      throw new AppError(ERROR_CODES.CONFLICT)
    }

    const { token, tokenHash } = await issueInvitationToken()
    const sentAt = new Date()
    const id = v7()
    const created = await db
      .insert(invitation)
      .values({
        email,
        expiresAt: invitationExpiry(sentAt),
        id,
        invitedBy: context.auth.user.id,
        locale: data.locale,
        role: data.role,
        sentAt,
        tokenHash,
      })
      .onConflictDoNothing()
      .returning({ id: invitation.id })
    if (created.length === 0) {
      throw new AppError(ERROR_CODES.CONFLICT)
    }

    try {
      await sendInvitationEmail({ email, inviter: context.auth.user.name, locale: data.locale, role: data.role, token })
    } catch (error) {
      await db.delete(invitation).where(eq(invitation.id, id))
      throw error
    }

    return { email }
  })

export const createInvitationMutation = mutationOptions({
  mutationFn: (data: Invitation["createInvitation"]) => createInvitation({ data }),
  mutationKey: INVITATION_MUTATION_KEYS.CREATE,
})
