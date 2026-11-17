import { LICENSE_TIER, type LicenseTier } from "~/src/modules/license/license.constants"

import { CLI_GENERATION, CLI_TEMPLATE_SUPPORT, NONE } from "~/src/data/cli"
import { FEATURE_STATUS, type FeatureStatus, MARKETING_SECTION_IDS } from "~/src/data/navigation.constants"

export const FOOTER_SECTIONS = [MARKETING_SECTION_IDS.FOUNDATION, MARKETING_SECTION_IDS.PRICING, MARKETING_SECTION_IDS.FAQ] as const

export const TIER_PRICES = {
  [LICENSE_TIER.AGENCY]: 899,
  [LICENSE_TIER.COMPLETE]: 399,
  [LICENSE_TIER.CORE]: 249,
} as const satisfies Record<LicenseTier, number>

export const REACTPROJECTS_ACCESS: FeatureStatus = FEATURE_STATUS.ARRIVING

export const ANGULARPROJECTS_ACCESS: FeatureStatus = FEATURE_STATUS.ARRIVING

export const REACTPROJECTS_URL = "https://reactprojects.com"

export const ANGULARPROJECTS_URL = "https://angularprojects.com"

export const REACTPROJECTS_FACTS = {
  reactprojects: new URL(REACTPROJECTS_URL).host,
  reactprojectsAccess: REACTPROJECTS_ACCESS,
  reactprojectsBuilds: 5,
} as const

export const ANGULARPROJECTS_FACTS = {
  angularprojects: new URL(ANGULARPROJECTS_URL).host,
  angularprojectsAccess: ANGULARPROJECTS_ACCESS,
  angularprojectsBuilds: 5,
} as const

export const COURSE_PLATFORM_VALUES = { ...REACTPROJECTS_FACTS, ...ANGULARPROJECTS_FACTS }

export const PRODUCT_CASE_STATUS = {
  LAUNCH: "launch",
  WAITLIST: "waitlist",
} as const

export const PRODUCT_CASES = [
  { id: "reactprojects", name: REACTPROJECTS_FACTS.reactprojects, status: PRODUCT_CASE_STATUS.WAITLIST, url: REACTPROJECTS_URL },
  { id: "angularprojects", name: ANGULARPROJECTS_FACTS.angularprojects, status: PRODUCT_CASE_STATUS.WAITLIST, url: ANGULARPROJECTS_URL },
  { id: "marte", name: "marte-bizuteria.pl", status: PRODUCT_CASE_STATUS.LAUNCH },
] as const

const TEMPLATES_GENERATE_BILLING = CLI_TEMPLATE_SUPPORT.choices.billing.some((option) => option !== NONE)

const BILLING_GENERATION: FeatureStatus = TEMPLATES_GENERATE_BILLING ? CLI_GENERATION : FEATURE_STATUS.ARRIVING

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

export const CONSULTING_HOURLY_RATE = 149

export const ILLUSTRATIVE_HOURLY_RATE = 150

export const CORE_PRICE_IN_HOURS = Math.ceil(TIER_PRICES[LICENSE_TIER.CORE] / ILLUSTRATIVE_HOURLY_RATE)
