import { adminClient, inferAdditionalFields, twoFactorClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"

import { ROLES, ac } from "~/src/integrations/better-auth/auth.access"
import type { auth } from "~/src/integrations/better-auth/auth.server"

export const authClient = createAuthClient({
  plugins: [adminClient({ ac, roles: ROLES }), inferAdditionalFields<typeof auth>(), twoFactorClient()],
})

export const { getSession, requestPasswordReset, resetPassword, sendVerificationEmail, signIn, signOut, signUp, useSession, verifyEmail } =
  authClient

export const { twoFactor } = authClient
