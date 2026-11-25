import { LICENSE_TIER, type LicenseTier } from "~/src/modules/license/license.constants"

import { CLI_GENERATION } from "~/src/data/cli"
import { ANGULARPROJECTS_ACCESS, BILLING_GENERATION, ILLUSTRATIVE_HOURLY_RATE, REACTPROJECTS_ACCESS } from "~/src/data/marketing"
import { FEATURE_STATUS, type FeatureStatus } from "~/src/data/navigation.constants"

export const TIER_PRICES = {
  [LICENSE_TIER.AGENCY]: 899,
  [LICENSE_TIER.COMPLETE]: 399,
  [LICENSE_TIER.CORE]: 249,
} as const satisfies Record<LicenseTier, number>

export const TIER_FEATURES = {
  [LICENSE_TIER.AGENCY]: [
    { id: "complete", status: FEATURE_STATUS.AVAILABLE },
    { id: "call", status: FEATURE_STATUS.AVAILABLE },
    { id: "clientProjects", status: CLI_GENERATION },
    { id: "seats", status: FEATURE_STATUS.ARRIVING },
    { id: "discord", status: FEATURE_STATUS.ARRIVING },
    { id: "figma", status: FEATURE_STATUS.ARRIVING },
  ],
  [LICENSE_TIER.COMPLETE]: [
    { id: "core", status: FEATURE_STATUS.AVAILABLE },
    { id: "reactprojects", status: REACTPROJECTS_ACCESS },
    { id: "angularprojects", status: ANGULARPROJECTS_ACCESS },
    { id: "support", status: FEATURE_STATUS.AVAILABLE },
    { id: "course", status: FEATURE_STATUS.ARRIVING },
    { id: "walkthrough", status: FEATURE_STATUS.ARRIVING },
  ],
  [LICENSE_TIER.CORE]: [
    { id: "cli", status: FEATURE_STATUS.AVAILABLE },
    { id: "updates", status: FEATURE_STATUS.AVAILABLE },
    { id: "source", status: CLI_GENERATION },
    { id: "providers", status: CLI_GENERATION },
    { id: "billing", status: BILLING_GENERATION },
    { id: "tests", status: CLI_GENERATION },
    { id: "projects", status: CLI_GENERATION },
  ],
} as const satisfies Record<LicenseTier, readonly { readonly id: string; readonly status: FeatureStatus }[]>

export const CORE_PRICE_IN_HOURS = Math.ceil(TIER_PRICES[LICENSE_TIER.CORE] / ILLUSTRATIVE_HOURLY_RATE)

export const PURCHASE_STEP = {
  ACCOUNT: 1,
  PAYMENT: 2,
} as const

export const PURCHASE_STEP_COUNT = Object.keys(PURCHASE_STEP).length

export const USER_LICENSE_DETAILS = [
  "tier",
  "status",
  "machineLimit",
  "purchasedAt",
  "withdrawalConsent",
  "firstActivation",
  "firstDownload",
  "firstLesson",
] as const

export const LICENSE_OFFER_ID = "license-offer"
