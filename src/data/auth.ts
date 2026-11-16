import { AUTH_PROVIDER } from "~/src/integrations/better-auth/auth.constants"

import { ROUTES } from "~/src/routes"

export const AUTH_ASSURANCES = ["coverage", "pricing", "ownership"] as const

export const OAUTH_PROVIDERS = [
  { id: AUTH_PROVIDER.GOOGLE, name: "Google" },
  { id: AUTH_PROVIDER.GITHUB, name: "GitHub" },
] as const

export const PASSWORD_RULES = ["atLeastMinCharactersLong", "atLeastOneSpecialCharacter", "atLeastOneUppercase", "passwordsMatch"] as const

export const SOCIAL_SIGN_IN_PATH = `${ROUTES.API_AUTH_BASE}${ROUTES.API_AUTH.SIGN_IN_SOCIAL}`

export const oauthCallbackPath = (provider: string): string => `${ROUTES.API_AUTH_BASE}${ROUTES.API_AUTH.CALLBACK}/${provider}`
