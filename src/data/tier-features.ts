import type { LicenseTier } from "~/src/modules/license/license.constants"

import { COURSE_PLATFORM_VALUES, TIER_FEATURES } from "~/src/data/marketing"
import type { FeatureStatus } from "~/src/data/navigation.constants"
import { REPOSITORY_FACTS } from "~/src/data/repository-facts"

export const TIER_FEATURE_VALUES = { coverageThreshold: REPOSITORY_FACTS.coverageThreshold, ...COURSE_PLATFORM_VALUES }

export const tierFeaturesWith = (tier: LicenseTier, status: FeatureStatus): readonly { readonly id: string }[] => {
  const features: readonly { readonly id: string; readonly status: FeatureStatus }[] = TIER_FEATURES[tier]

  return features.filter((feature) => feature.status === status)
}
