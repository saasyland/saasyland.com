import { LICENSE_TIER, type LicenseTier } from "~/src/modules/license/license.constants"

import { CLI_GENERATION } from "~/src/data/cli"
import { FEATURE_STATUS, type FeatureStatus, MARKETING_SECTION_IDS } from "~/src/data/navigation.constants"

export const FOOTER_SECTIONS = [MARKETING_SECTION_IDS.FOUNDATION, MARKETING_SECTION_IDS.PRICING, MARKETING_SECTION_IDS.FAQ] as const

export const TIER_PRICES = {
  [LICENSE_TIER.AGENCY]: 899,
  [LICENSE_TIER.COMPLETE]: 399,
  [LICENSE_TIER.CORE]: 249,
} as const satisfies Record<LicenseTier, number>

export const TIER_FEATURES = {
  [LICENSE_TIER.AGENCY]: [
    { id: "complete", status: FEATURE_STATUS.AVAILABLE },
    { id: "call", status: FEATURE_STATUS.AVAILABLE },
    { id: "clientProjects", status: FEATURE_STATUS.ARRIVING },
    { id: "seats", status: FEATURE_STATUS.ARRIVING },
    { id: "discord", status: FEATURE_STATUS.ARRIVING },
    { id: "figma", status: FEATURE_STATUS.ARRIVING },
  ],
  [LICENSE_TIER.COMPLETE]: [
    { id: "core", status: FEATURE_STATUS.AVAILABLE },
    { id: "reactprojects", status: FEATURE_STATUS.AVAILABLE },
    { id: "support", status: FEATURE_STATUS.AVAILABLE },
    { id: "course", status: FEATURE_STATUS.ARRIVING },
    { id: "walkthrough", status: FEATURE_STATUS.ARRIVING },
  ],
  [LICENSE_TIER.CORE]: [
    { id: "cli", status: FEATURE_STATUS.AVAILABLE },
    { id: "updates", status: FEATURE_STATUS.AVAILABLE },
    { id: "source", status: CLI_GENERATION },
    { id: "providers", status: CLI_GENERATION },
    { id: "tests", status: CLI_GENERATION },
    { id: "projects", status: CLI_GENERATION },
  ],
} as const satisfies Record<LicenseTier, readonly { readonly id: string; readonly status: FeatureStatus }[]>

export const CONSULTING_HOURLY_RATE = 149

export const ILLUSTRATIVE_HOURLY_RATE = 150

export const CORE_PRICE_IN_HOURS = Math.ceil(TIER_PRICES[LICENSE_TIER.CORE] / ILLUSTRATIVE_HOURLY_RATE)

export const REACTPROJECTS_FACTS = { reactprojectsBuilds: 5 } as const
