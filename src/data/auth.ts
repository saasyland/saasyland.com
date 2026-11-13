import { AUTH_PROVIDER } from "~/src/integrations/better-auth/auth.constants"
export const AUTH_ASSURANCES = ["coverage", "pricing", "ownership"] as const

export const OAUTH_PROVIDERS = [
  { id: AUTH_PROVIDER.GOOGLE, name: "Google" },
  { id: AUTH_PROVIDER.GITHUB, name: "GitHub" },
] as const

export const PASSWORD_RULES = ["atLeastMinCharactersLong", "atLeastOneSpecialCharacter", "atLeastOneUppercase", "passwordsMatch"] as const
