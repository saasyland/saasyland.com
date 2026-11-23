import "@tanstack/react-start/server-only"

import type { BetterAuthPlugin } from "better-auth"
import { APIError, createAuthEndpoint } from "better-auth/api"
import { setSessionCookie } from "better-auth/cookies"

import { AUTH_PROVIDER } from "~/src/integrations/better-auth/auth.constants"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { invitation } from "~/src/modules/invitation/invitation.schema"
import { openInvitation } from "~/src/modules/invitation/invitation.utils"
import { invitationZodSchemas } from "~/src/modules/invitation/invitation.zod"

import { sha256Hex } from "~/src/lib/hex"

import * as ROUTES from "~/src/routes"

const PLUGIN_ID = "invitation"

const INVITATION_NOT_OPEN = { code: "INVITATION_NOT_OPEN", message: "The invitation is no longer open" }
const ACCOUNT_EXISTS = { code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL", message: "User already exists. Use another email." }

export const invitationPlugin = () =>
  ({
    endpoints: {
      acceptInvitation: createAuthEndpoint(
        ROUTES.API_AUTH.ACCEPT_INVITATION,
        { body: invitationZodSchemas.acceptInvitation, metadata: { SERVER_ONLY: true }, method: "POST" },
        async (ctx) => {
          const tokenHash = await sha256Hex(ctx.body.token)
          const [pending] = await db
            .select({ email: invitation.email, role: invitation.role })
            .from(invitation)
            .where(openInvitation(tokenHash, new Date()))
          if (pending === undefined) {
            throw APIError.from("NOT_FOUND", INVITATION_NOT_OPEN)
          }
          if ((await ctx.context.internalAdapter.findUserByEmail(pending.email)) !== null) {
            throw APIError.from("BAD_REQUEST", ACCOUNT_EXISTS)
          }

          const password = await ctx.context.password.hash(ctx.body.password)
          const created = await ctx.context.internalAdapter.createUser(
            { email: pending.email, emailVerified: true, name: ctx.body.name, role: pending.role },
            { method: PLUGIN_ID },
          )
          await ctx.context.internalAdapter.linkAccount({
            accountId: created.id,
            password,
            providerId: AUTH_PROVIDER.CREDENTIAL,
            userId: created.id,
          })
          const acceptedAt = new Date()
          const claimed = await db
            .update(invitation)
            .set({ acceptedAt, acceptedBy: created.id })
            .where(openInvitation(tokenHash, acceptedAt))
            .returning({ id: invitation.id })
          if (claimed.length === 0) {
            await ctx.context.internalAdapter.deleteUser(created.id)
            throw APIError.from("NOT_FOUND", INVITATION_NOT_OPEN)
          }

          const session = await ctx.context.internalAdapter.createSession(created.id)
          await setSessionCookie(ctx, { session, user: created })

          return ctx.json({ role: pending.role })
        },
      ),
    },
    id: PLUGIN_ID,
  }) satisfies BetterAuthPlugin
