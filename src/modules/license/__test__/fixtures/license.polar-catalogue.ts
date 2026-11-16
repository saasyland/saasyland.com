import type { PolarCatalogue, PolarDiscount } from "~/src/platform/testing/lib/polar"

import { BASIS_POINTS_PER_PERCENT } from "~/src/integrations/polar/polar.discounts"

import { PPP_PERCENTS_OFF } from "~/src/modules/_core/constants/pricing"
import { licensePolarProduct } from "~/src/modules/license/__test__/fixtures/polar-product"
import { LICENSE_ACTIVATION_LIMITS, LICENSE_TIERS } from "~/src/modules/license/license.constants"
import { POLAR_PRODUCT_IDS } from "~/src/modules/license/license.utils"

const LICENSE_KEY_PREFIX = "SAASYLAND"
const UUID_NODE_DIGITS = 12

const TIER_PRODUCTS = LICENSE_TIERS.map((tier) => ({ product: licensePolarProduct(tier, POLAR_PRODUCT_IDS[tier]), tier }))

const PRODUCTS = TIER_PRODUCTS.map(({ product }) => product)

export const REGIONAL_POLAR_DISCOUNTS = PPP_PERCENTS_OFF.map((percentOff): PolarDiscount => {
  const basisPoints = percentOff * BASIS_POINTS_PER_PERCENT
  return {
    basisPoints,
    id: `00000000-0000-4000-8000-${String(basisPoints).padStart(UUID_NODE_DIGITS, "0")}`,
    name: `Regional pricing ${String(percentOff)}%`,
    products: PRODUCTS,
  }
})

export const LICENSE_POLAR_CATALOGUE = {
  discounts: REGIONAL_POLAR_DISCOUNTS,
  licenseKeyBenefits: TIER_PRODUCTS.map(({ product, tier }) => ({
    activationLimit: LICENSE_ACTIVATION_LIMITS[tier],
    id: `${product.id}-license-keys`,
    prefix: LICENSE_KEY_PREFIX,
    products: [product],
  })),
  products: PRODUCTS,
} satisfies PolarCatalogue
