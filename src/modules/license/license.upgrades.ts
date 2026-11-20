import * as zod from "zod"

import { LICENSE_CHECKOUT_METADATA, LICENSE_TIERS, type LicenseTier } from "~/src/modules/license/license.constants"

const upgradeOriginSchema = zod.object({
  [LICENSE_CHECKOUT_METADATA.UPGRADE_FROM_ORDER]: zod.string().min(1),
  [LICENSE_CHECKOUT_METADATA.UPGRADE_FROM_TIER]: zod.enum(LICENSE_TIERS),
})

export interface UpgradeOrigin {
  readonly order: string
  readonly tier: LicenseTier
}

export const isUpgrade = (from: LicenseTier, to: LicenseTier): boolean => LICENSE_TIERS.indexOf(to) > LICENSE_TIERS.indexOf(from)

export const higherTiers = (tier: LicenseTier): readonly LicenseTier[] => LICENSE_TIERS.filter((candidate) => isUpgrade(tier, candidate))

export const upgradeOrigin = (metadata: unknown): UpgradeOrigin | undefined => {
  const parsed = upgradeOriginSchema.safeParse(metadata)

  if (!parsed.success) {
    return undefined
  }

  return {
    order: parsed.data[LICENSE_CHECKOUT_METADATA.UPGRADE_FROM_ORDER],
    tier: parsed.data[LICENSE_CHECKOUT_METADATA.UPGRADE_FROM_TIER],
  }
}

export const upgradeMetadata = ({ order, tier }: UpgradeOrigin): Record<string, string> => ({
  [LICENSE_CHECKOUT_METADATA.UPGRADE_FROM_ORDER]: order,
  [LICENSE_CHECKOUT_METADATA.UPGRADE_FROM_TIER]: tier,
})
