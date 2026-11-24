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

export const COURSE_LICENSE_TIERS: readonly LicenseTier[] = [LICENSE_TIER.COMPLETE, LICENSE_TIER.AGENCY]

export const OFFERED_COURSE_TIER = LICENSE_TIER.COMPLETE

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

export type LicenseStatus = (typeof LICENSE_STATUSES)[number]

export const LICENSE_API_ENDPOINTS = [
  "LICENSE",
  "ACTIVATE",
  "VALIDATE",
  "BUNDLE",
  "DEACTIVATE",
] as const satisfies readonly (keyof typeof API_ENDPOINT)[]

export const REFUND_ELIGIBILITY = {
  EXPIRED: "expired",
  REFUNDABLE: "refundable",
  STATUTORY_WITHDRAWAL: "statutoryWithdrawal",
  USED: "used",
} as const

export const FIRST_USE = {
  LESSON: "lesson",
  TEMPLATES: "templates",
} as const

export type FirstUse = (typeof FIRST_USE)[keyof typeof FIRST_USE]

export const LICENSE_CHECKOUT_FIELD = {
  WITHDRAWAL_CONSENT: "withdrawal_consent",
} as const

export const LICENSE_CHECKOUT_METADATA = {
  LOCALE: "locale",
  UPGRADE_FROM_ORDER: "upgrade_from_order",
  UPGRADE_FROM_TIER: "upgrade_from_tier",
} as const

export const LICENSE_API_RETRY_AFTER_SECONDS = 30

export const LICENSE_POLL_MS = {
  KEY: 2000,
  SETUP: 5000,
} as const

export const BUNDLE_BINDING = "BUNDLES"

export const BUNDLE_PATH_PREFIX = "/bundles"

export const BUNDLE_ARCHIVE_EXTENSION = ".json.gz"

export const BUNDLE_CONTENT_TYPE = "application/gzip"

export const BUNDLE_METADATA = {
  SHA256: "sha256",
} as const

export const LICENSE_QUERY_KEYS = {
  ACTIVATIONS: ["license", "activations"],
  ALL: ["license"],
  COUNTS: ["license", "getLicenseCounts"],
  CURRENT: ["license", "current"],
  KEY: ["license", "key"],
  UNLICENSED_ORDERS: ["license", "getUnlicensedOrders"],
  UPGRADE_PRICE: ["license", "upgradePrice"],
  USER: ["license", "getUserLicense"],
  USER_ACTIVATIONS: ["license", "getUserActivations"],
} as const

export const LICENSE_ACTIVATIONS_TIMEOUT_SECONDS = 3

export const LICENSE_MACHINES = {
  LISTED: "listed",
  NO_KEY: "noKey",
  UNAVAILABLE: "unavailable",
} as const

export const LICENSE_ACTIVATIONS_STALE_MS = 60_000

export const LICENSE_MUTATION_KEYS = {
  DEACTIVATE: ["license", "deactivateLicense"],
  START_CHECKOUT: ["license", "startCheckout"],
} as const

export const LICENSE_EMAIL_PURPOSE = {
  PURCHASE_CONFIRMATION: "purchase-confirmation",
  UNMATCHED_ORDER_ALERT: "unmatched-order-alert",
} as const
