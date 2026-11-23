import zod from "zod/v4"

import { LICENSE_CHECKOUT_METADATA, LICENSE_STATUS, LICENSE_TIERS, type LicenseTier } from "~/src/modules/license/license.constants"
import type { License } from "~/src/modules/license/license.types"

export interface UpgradeOrigin {
  readonly order: string
  readonly tier: LicenseTier
}

export type UpgradableLicense = License["select"] & { readonly polarLicenseKeyId: string; readonly polarOrderId: string }

const upgradeOriginSchema = zod
  .object({
    [LICENSE_CHECKOUT_METADATA.UPGRADE_FROM_ORDER]: zod.string().min(1),
    [LICENSE_CHECKOUT_METADATA.UPGRADE_FROM_TIER]: zod.enum(LICENSE_TIERS),
  })
  .transform((metadata): UpgradeOrigin => ({
    order: metadata[LICENSE_CHECKOUT_METADATA.UPGRADE_FROM_ORDER],
    tier: metadata[LICENSE_CHECKOUT_METADATA.UPGRADE_FROM_TIER],
  }))

export const isUpgrade = (from: LicenseTier, to: LicenseTier): boolean => LICENSE_TIERS.indexOf(to) > LICENSE_TIERS.indexOf(from)

export const higherTiers = (tier: LicenseTier): readonly LicenseTier[] => LICENSE_TIERS.filter((candidate) => isUpgrade(tier, candidate))

export const hasReachedTier = <Licence extends Pick<License["select"], "status" | "tier">>(
  license: Licence | undefined,
  tier: LicenseTier | undefined,
): license is Licence => license?.status === LICENSE_STATUS.ACTIVE && (tier === undefined || !isUpgrade(license.tier, tier))

export const canUpgrade = (license: License["select"] | undefined, tier: LicenseTier): license is UpgradableLicense =>
  license?.status === LICENSE_STATUS.ACTIVE &&
  license.polarOrderId !== null &&
  license.polarLicenseKeyId !== null &&
  isUpgrade(license.tier, tier)

export const upgradeOrigin = (metadata: unknown): UpgradeOrigin | undefined => upgradeOriginSchema.safeParse(metadata).data

export const upgradeMetadata = ({ order, tier }: UpgradeOrigin): Record<string, string> => ({
  [LICENSE_CHECKOUT_METADATA.UPGRADE_FROM_ORDER]: order,
  [LICENSE_CHECKOUT_METADATA.UPGRADE_FROM_TIER]: tier,
})
