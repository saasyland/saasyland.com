export const MARKETING_SECTION_IDS = {
  CLI: "cli",
  FAQ: "faq",
  FOUNDATION: "foundation",
  PRICING: "pricing",
  QUALITY: "quality",
  TOOLKIT: "toolkit",
} as const

export const TIERS = ["core", "complete", "agency"] as const

export const TIER_PRICES = {
  agency: 899,
  complete: 399,
  core: 249,
} as const satisfies Record<(typeof TIERS)[number], number>
