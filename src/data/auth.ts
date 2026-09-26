export const AUTH_ASSURANCES = ["coverage", "pricing", "ownership"] as const

export const OAUTH_PROVIDERS = [
  { id: "google", name: "Google" },
  { id: "github", name: "GitHub" },
] as const

export const PASSWORD_RULES = ["atLeastMinCharactersLong", "atLeastOneSpecialCharacter", "atLeastOneUppercase", "passwordsMatch"] as const
