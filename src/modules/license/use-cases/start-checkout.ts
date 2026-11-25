import type { models } from "@polar-sh/sdk/2026-10"
import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { authorized, withRateLimit } from "~/src/integrations/better-auth/auth.middleware"
import { POLAR_FIXED_PRICE, POLAR_PRICE_CURRENCY } from "~/src/integrations/polar/polar.constants"

import { toMinorUnits } from "~/src/modules/_core/constants/currency"
import { DEFAULT_CURRENCY_CODE } from "~/src/modules/_core/constants/pricing"
import { LICENSE_MUTATION_KEYS, LICENSE_STATUS } from "~/src/modules/license/license.constants"
import { buyerTierPrice } from "~/src/modules/license/license.ppp"
import type { License } from "~/src/modules/license/license.types"
import { upgradePrice } from "~/src/modules/license/license.upgrade-price"
import { canUpgrade, upgradeMetadata } from "~/src/modules/license/license.upgrades"
import { POLAR_PRODUCT_IDS } from "~/src/modules/license/license.utils"
import { licenseZodSchemas } from "~/src/modules/license/license.zod"
import { getLicense } from "~/src/modules/license/use-cases/get-license"
import { type CheckoutTerms, createCheckout } from "~/src/modules/order/order.checkout"
import { CHECKOUT_RATE_LIMIT, CHECKOUT_RATE_LIMIT_KIND } from "~/src/modules/order/order.constants"

import { TIER_PRICES } from "~/src/data/license"

import * as ROUTES from "~/src/routes"

interface TierPrice {
  readonly amount: number
  readonly metadata: Record<string, string>
}

const adHocPrices = (productId: string, amount: number): Pick<models.CheckoutCreate, "prices"> => ({
  prices: { [productId]: [{ amount_type: POLAR_FIXED_PRICE, price_amount: amount, price_currency: POLAR_PRICE_CURRENCY }] },
})

const tierPrice = async (
  current: License["select"] | undefined,
  tier: License["startCheckout"]["tier"],
  headers: Headers,
): Promise<TierPrice> => {
  if (!canUpgrade(current, tier)) {
    return { amount: toMinorUnits(buyerTierPrice(headers, tier), DEFAULT_CURRENCY_CODE), metadata: {} }
  }

  const upgrade = await upgradePrice(current, tier, headers)

  return { amount: upgrade.amount, metadata: upgradeMetadata({ order: upgrade.fromOrder, tier: upgrade.fromTier }) }
}

const checkoutTerms = ({ amount, metadata }: TierPrice, tier: License["startCheckout"]["tier"]): CheckoutTerms => ({
  allow_discount_codes: false,
  metadata,
  ...(amount !== toMinorUnits(TIER_PRICES[tier], DEFAULT_CURRENCY_CODE) && adHocPrices(POLAR_PRODUCT_IDS[tier], amount)),
})

export const startCheckout = createServerFn({ method: "POST" })
  .middleware([withRateLimit(CHECKOUT_RATE_LIMIT_KIND, CHECKOUT_RATE_LIMIT), authorized()])
  .validator((input: License["startCheckout"]) => licenseZodSchemas.startCheckout.parse(input))
  .handler(async ({ context, data: { locale, redirect, returnPath, tier } }) => {
    const current = await getLicense(context.auth.user.id)

    if (current?.status === LICENSE_STATUS.ACTIVE && !canUpgrade(current, tier)) {
      return { alreadyActive: true } as const
    }

    const purchase = new URLSearchParams({ ...(redirect !== undefined && { redirect }), tier })
    const price = await tierPrice(current, tier, context.requestHeaders)

    return createCheckout(
      context,
      { locale, productId: POLAR_PRODUCT_IDS[tier], returnPath, successPath: `${ROUTES.APP}?${purchase.toString()}` },
      checkoutTerms(price, tier),
    )
  })

export const startCheckoutMutation = mutationOptions({
  mutationFn: (data: License["startCheckout"]) => startCheckout({ data }),
  mutationKey: LICENSE_MUTATION_KEYS.START_CHECKOUT,
})
