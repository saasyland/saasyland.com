import "@tanstack/react-start/server-only"

import { env } from "cloudflare:workers"

import { LICENSE_TIER, LICENSE_TIERS, type LicenseTier } from "~/src/modules/license/license.constants"

export const POLAR_PRODUCT_IDS = {
  [LICENSE_TIER.AGENCY]: env.POLAR_PRODUCT_ID_AGENCY,
  [LICENSE_TIER.COMPLETE]: env.POLAR_PRODUCT_ID_COMPLETE,
  [LICENSE_TIER.CORE]: env.POLAR_PRODUCT_ID_CORE,
} as const satisfies Record<LicenseTier, string>

export const licenseTierForProduct = (productId: string): LicenseTier | undefined =>
  LICENSE_TIERS.find((tier) => POLAR_PRODUCT_IDS[tier] === productId)
