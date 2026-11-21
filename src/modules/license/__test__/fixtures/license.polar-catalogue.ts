import type { PolarCatalogue } from "~/src/platform/testing/lib/polar"

import { licensePolarProduct } from "~/src/modules/license/__test__/fixtures/polar-product"
import { LICENSE_ACTIVATION_LIMITS, LICENSE_TIERS } from "~/src/modules/license/license.constants"
import { POLAR_PRODUCT_IDS } from "~/src/modules/license/license.utils"

const LICENSE_KEY_PREFIX = "SAASYLAND"

const TIER_PRODUCTS = LICENSE_TIERS.map((tier) => ({ product: licensePolarProduct(tier, POLAR_PRODUCT_IDS[tier]), tier }))

export const LICENSE_POLAR_CATALOGUE = {
  licenseKeyBenefits: TIER_PRODUCTS.map(({ product, tier }) => ({
    activationLimit: LICENSE_ACTIVATION_LIMITS[tier],
    id: `${product.id}-license-keys`,
    prefix: LICENSE_KEY_PREFIX,
    products: [product],
  })),
  products: TIER_PRODUCTS.map(({ product }) => product),
} satisfies PolarCatalogue
