export const LICENSE_TIER = {
  AGENCY: "agency",
  COMPLETE: "complete",
  CORE: "core",
} as const

export const LICENSE_TIERS = [LICENSE_TIER.CORE, LICENSE_TIER.COMPLETE, LICENSE_TIER.AGENCY] as const

export type LicenseTier = (typeof LICENSE_TIERS)[number]

export const LICENSE_STATUS = {
  ACTIVE: "active",
  REVOKED: "revoked",
} as const

export const POLAR_ID_MAX_LENGTH = 64
export const LICENSE_KEY_MAX_LENGTH = 128

export const LICENSE_QUERY_KEYS = {
  ACTIVATIONS: ["license", "activations"],
  ALL: ["license"],
  CURRENT: ["license", "current"],
} as const

export const LICENSE_MUTATION_KEYS = {
  DEACTIVATE: ["license", "deactivateLicense"],
  START_CHECKOUT: ["license", "startCheckout"],
} as const
