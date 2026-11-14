import "@tanstack/react-start/server-only"

import { env } from "cloudflare:workers"

import { LICENSE_TIER, type LicenseTier } from "~/src/modules/license/license.constants"

export const licenseTierForProduct = (productId: string): LicenseTier | undefined => {
  if (productId === env.POLAR_PRODUCT_ID_CORE) {
    return LICENSE_TIER.CORE
  }

  if (productId === env.POLAR_PRODUCT_ID_COMPLETE) {
    return LICENSE_TIER.COMPLETE
  }

  if (productId === env.POLAR_PRODUCT_ID_AGENCY) {
    return LICENSE_TIER.AGENCY
  }

  return undefined
}
