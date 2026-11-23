import type { BrowserArea, RootComponent } from "~/src/areas/browser"
import { AFFILIATE_PROGRAM } from "~/src/data/affiliates"
import { FEATURE_STATUS, type FeatureStatus } from "~/src/data/navigation.constants"

import { AffiliateReferral } from "~/src/presentation/components/custom/affiliate-referral"

const ROOT_COMPONENTS = {
  [FEATURE_STATUS.ARRIVING]: [],
  [FEATURE_STATUS.AVAILABLE]: [{ component: AffiliateReferral, key: "affiliateReferral" }],
} as const satisfies Record<FeatureStatus, readonly RootComponent[]>

export const AFFILIATES_BROWSER = { name: "affiliates", rootComponents: ROOT_COMPONENTS[AFFILIATE_PROGRAM] } as const satisfies BrowserArea
