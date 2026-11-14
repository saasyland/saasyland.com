import { LICENSE_TIER } from "~/src/modules/license/license.constants"
export const MARKETING_SECTION_IDS = {
  CLI: "cli",
  FAQ: "faq",
  FOUNDATION: "foundation",
  PRICING: "pricing",
  QUALITY: "quality",
  TOOLKIT: "toolkit",
} as const

export const TIERS = [LICENSE_TIER.CORE, LICENSE_TIER.COMPLETE, LICENSE_TIER.AGENCY] as const

export const TIER_PRICES = {
  [LICENSE_TIER.AGENCY]: 899,
  [LICENSE_TIER.COMPLETE]: 399,
  [LICENSE_TIER.CORE]: 249,
} as const satisfies Record<(typeof TIERS)[number], number>

export const CONSULTING_HOURLY_RATE = 149
