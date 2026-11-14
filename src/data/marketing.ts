import { LICENSE_TIER, type LicenseTier } from "~/src/modules/license/license.constants"

export const MARKETING_SECTION_IDS = {
  CLI: "cli",
  FAQ: "faq",
  FOUNDATION: "foundation",
  PRICING: "pricing",
  QUALITY: "quality",
  TOOLKIT: "toolkit",
} as const

export const NAVIGATION_SECTIONS = [
  MARKETING_SECTION_IDS.FOUNDATION,
  MARKETING_SECTION_IDS.QUALITY,
  MARKETING_SECTION_IDS.TOOLKIT,
  MARKETING_SECTION_IDS.PRICING,
  MARKETING_SECTION_IDS.FAQ,
] as const

export const FOOTER_SECTIONS = [MARKETING_SECTION_IDS.FOUNDATION, MARKETING_SECTION_IDS.PRICING, MARKETING_SECTION_IDS.FAQ] as const

export const TIER_PRICES = {
  [LICENSE_TIER.AGENCY]: 899,
  [LICENSE_TIER.COMPLETE]: 399,
  [LICENSE_TIER.CORE]: 249,
} as const satisfies Record<LicenseTier, number>

export const CONSULTING_HOURLY_RATE = 149
