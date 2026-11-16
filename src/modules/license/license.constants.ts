import type { models } from "@polar-sh/sdk/2026-10"
import type { API_ENDPOINT, Api } from "@saasyland/stack/api"

import { POLAR_WEBHOOK_EVENT } from "../../integrations/polar/polar.constants.ts"

export const LICENSE_TIER = {
  AGENCY: "agency",
  COMPLETE: "complete",
  CORE: "core",
} as const satisfies Record<string, Api["tier"]>

export const LICENSE_TIERS = [LICENSE_TIER.CORE, LICENSE_TIER.COMPLETE, LICENSE_TIER.AGENCY] as const

export type LicenseTier = (typeof LICENSE_TIERS)[number]

export const LICENSE_ACTIVATION_LIMITS = {
  [LICENSE_TIER.AGENCY]: 20,
  [LICENSE_TIER.COMPLETE]: 5,
  [LICENSE_TIER.CORE]: 3,
} as const satisfies Record<Api["tier"], number>

export const LICENSE_WEBHOOK_EVENTS = {
  onBenefitGrantCreated: "benefit_grant.created",
  onBenefitGrantRevoked: "benefit_grant.revoked",
  onOrderPaid: POLAR_WEBHOOK_EVENT.ORDER_PAID,
  onOrderRefunded: POLAR_WEBHOOK_EVENT.ORDER_REFUNDED,
} as const satisfies Record<string, models.WebhookEventType>

export const LICENSE_STATUS = {
  ACTIVE: "active",
  REFUNDED: "refunded",
  REVOKED: "revoked",
} as const

export const LICENSE_STATUSES = [LICENSE_STATUS.ACTIVE, LICENSE_STATUS.REVOKED, LICENSE_STATUS.REFUNDED] as const

export const LICENSE_API_ENDPOINTS = [
  "LICENSE",
  "ACTIVATE",
  "VALIDATE",
  "BUNDLE",
  "DEACTIVATE",
] as const satisfies readonly (keyof typeof API_ENDPOINT)[]

export const LICENSE_API_RETRY_AFTER_SECONDS = 30

export const REGIONAL_DISCOUNTS_REFRESH_AFTER_MS = 300_000

export const BUNDLE_BINDING = "BUNDLES"

export const BUNDLE_PATH_PREFIX = "/bundles"

export const BUNDLE_ARCHIVE_EXTENSION = ".json.gz"

export const BUNDLE_CONTENT_TYPE = "application/gzip"

export const POLAR_ID_MAX_LENGTH = 64

export const LICENSE_QUERY_KEYS = {
  ACTIVATIONS: ["license", "activations"],
  ALL: ["license"],
  CURRENT: ["license", "current"],
} as const

export const LICENSE_MUTATION_KEYS = {
  DEACTIVATE: ["license", "deactivateLicense"],
  START_CHECKOUT: ["license", "startCheckout"],
} as const
