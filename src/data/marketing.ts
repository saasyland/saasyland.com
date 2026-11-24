import { NONE } from "@saasyland/stack"

import { CLI_GENERATION, CLI_TEMPLATE_SUPPORT } from "~/src/data/cli"
import { FEATURE_STATUS, type FeatureStatus, MARKETING_SECTION_IDS } from "~/src/data/navigation.constants"

export const FOOTER_SECTIONS = [MARKETING_SECTION_IDS.FOUNDATION, MARKETING_SECTION_IDS.PRICING, MARKETING_SECTION_IDS.FAQ] as const

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

export const BILLING_GENERATION: FeatureStatus = TEMPLATES_GENERATE_BILLING ? CLI_GENERATION : FEATURE_STATUS.ARRIVING

export const CONSULTING_HOURLY_RATE = 149

export const ILLUSTRATIVE_HOURLY_RATE = 150
