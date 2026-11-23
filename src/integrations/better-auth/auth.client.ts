import { adminClient, inferAdditionalFields, lastLoginMethodClient, twoFactorClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"

import { ROLES, ac } from "~/src/integrations/better-auth/auth.access"
import { LAST_LOGIN_METHOD_COOKIE } from "~/src/integrations/better-auth/auth.constants"
import type { auth } from "~/src/integrations/better-auth/auth.server"

import * as ROUTES from "~/src/routes"

export const authClient = createAuthClient({
  basePath: ROUTES.API_AUTH_BASE,
  plugins: [
    adminClient({ ac, roles: ROLES }),
    inferAdditionalFields<typeof auth>(),
    lastLoginMethodClient({ cookieName: LAST_LOGIN_METHOD_COOKIE }),
    twoFactorClient(),
  ],
})

export const { getLastUsedLoginMethod, signIn } = authClient
