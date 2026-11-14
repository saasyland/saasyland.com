import type { RootComponentEntry } from "~/src/data/root"

import { AffiliateReferral } from "~/src/presentation/components/custom/affiliate-referral"

export const AFFILIATES_ROOT_COMPONENTS = [
  { component: AffiliateReferral, key: "affiliateReferral" },
] as const satisfies readonly RootComponentEntry[]
