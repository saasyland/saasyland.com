import { AFFILIATE_PROGRAM } from "~/src/data/affiliates"
import { FEATURE_STATUS, type FeatureStatus } from "~/src/data/navigation.constants"
import type { RootComponentEntry } from "~/src/data/root"

import { AffiliateReferral } from "~/src/presentation/components/custom/affiliate-referral"

const ROOT_COMPONENTS_BY_PROGRAM = {
  [FEATURE_STATUS.ARRIVING]: [],
  [FEATURE_STATUS.AVAILABLE]: [{ component: AffiliateReferral, key: "affiliateReferral" }],
} as const satisfies Record<FeatureStatus, readonly RootComponentEntry[]>

export const AFFILIATES_ROOT_COMPONENTS: readonly RootComponentEntry[] = ROOT_COMPONENTS_BY_PROGRAM[AFFILIATE_PROGRAM]
