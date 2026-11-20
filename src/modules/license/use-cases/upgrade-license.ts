import "@tanstack/react-start/server-only"

import { and, eq } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { polar } from "~/src/integrations/polar/polar.config"

import { LICENSE_ACTIVATION_LIMITS, LICENSE_STATUS, type LicenseTier } from "~/src/modules/license/license.constants"
import { license } from "~/src/modules/license/license.schema"
import { type UpgradeOrigin, isUpgrade } from "~/src/modules/license/license.upgrades"
import { getLicense } from "~/src/modules/license/use-cases/get-license"

interface UpgradeLicenseInput {
  readonly origin: UpgradeOrigin | undefined
  readonly tier: LicenseTier
  readonly userId: string
}

export const upgradeLicense = async ({ origin, tier, userId }: UpgradeLicenseInput): Promise<boolean> => {
  if (origin === undefined) {
    return false
  }

  const current = await getLicense(userId)

  if (current?.status !== LICENSE_STATUS.ACTIVE || current.polarOrderId !== origin.order || current.polarLicenseKeyId === null) {
    return false
  }

  if (!isUpgrade(current.tier, tier)) {
    return true
  }

  await polar.licenseKeys.update(current.polarLicenseKeyId, { limit_activations: LICENSE_ACTIVATION_LIMITS[tier] })
  await db
    .update(license)
    .set({ tier })
    .where(and(eq(license.userId, userId), eq(license.polarOrderId, origin.order), eq(license.status, LICENSE_STATUS.ACTIVE)))

  return true
}
