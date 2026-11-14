import type { models } from "@polar-sh/sdk/2026-10"

export const LICENSE_TIER = {
  AGENCY: "agency",
  COMPLETE: "complete",
  CORE: "core",
} as const

export const LICENSE_TIERS = [LICENSE_TIER.CORE, LICENSE_TIER.COMPLETE, LICENSE_TIER.AGENCY] as const

export type LicenseTier = (typeof LICENSE_TIERS)[number]

export const LICENSE_ACTIVATION_LIMITS = {
  [LICENSE_TIER.AGENCY]: 20,
  [LICENSE_TIER.COMPLETE]: 5,
  [LICENSE_TIER.CORE]: 3,
} as const satisfies Record<LicenseTier, number>

export const LICENSE_WEBHOOK_EVENTS = {
  onBenefitGrantCreated: "benefit_grant.created",
  onBenefitGrantRevoked: "benefit_grant.revoked",
  onOrderPaid: "order.paid",
  onOrderRefunded: "order.refunded",
} as const satisfies Record<string, models.WebhookEventType>

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
