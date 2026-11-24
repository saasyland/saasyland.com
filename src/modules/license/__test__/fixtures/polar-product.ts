import type { PolarProduct } from "~/src/platform/testing/lib/polar"

import { toMinorUnits } from "~/src/modules/_core/constants/currency"
import { DEFAULT_CURRENCY_CODE } from "~/src/modules/_core/constants/pricing"
import { LICENSE_CHECKOUT_FIELD, type LicenseTier } from "~/src/modules/license/license.constants"

import { TIER_PRICES } from "~/src/data/license"

export const licensePolarProduct = (tier: LicenseTier, id: string): PolarProduct => ({
  id,
  name: tier,
  price: { amount: toMinorUnits(TIER_PRICES[tier], DEFAULT_CURRENCY_CODE), currency: DEFAULT_CURRENCY_CODE },
  recurringInterval: null,
  requiredCheckboxes: [LICENSE_CHECKOUT_FIELD.WITHDRAWAL_CONSENT],
})
