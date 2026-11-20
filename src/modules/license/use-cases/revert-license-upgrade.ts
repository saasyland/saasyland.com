import "@tanstack/react-start/server-only"

import { and, eq } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { polar } from "~/src/integrations/polar/polar.config"

import { LICENSE_ACTIVATION_LIMITS, LICENSE_STATUS, type LicenseTier } from "~/src/modules/license/license.constants"
import { license } from "~/src/modules/license/license.schema"
import type { UpgradeOrigin } from "~/src/modules/license/license.upgrades"
import { getLicense } from "~/src/modules/license/use-cases/get-license"

interface RevertLicenseUpgradeInput {
  readonly origin: UpgradeOrigin
  readonly tier: LicenseTier
  readonly userId: string
}

export const revertLicenseUpgrade = async ({ origin, tier, userId }: RevertLicenseUpgradeInput): Promise<void> => {
  const current = await getLicense(userId)

  if (
    current?.status !== LICENSE_STATUS.ACTIVE ||
    current.polarOrderId !== origin.order ||
    current.tier !== tier ||
    current.polarLicenseKeyId === null
  ) {
    return
  }

  await polar.licenseKeys.update(current.polarLicenseKeyId, { limit_activations: LICENSE_ACTIVATION_LIMITS[origin.tier] })
  await db
    .update(license)
    .set({ tier: origin.tier })
    .where(and(eq(license.userId, userId), eq(license.polarOrderId, origin.order), eq(license.tier, tier)))
}
