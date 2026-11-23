import type { models } from "@polar-sh/sdk/2026-10"
import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"
import { getIP } from "better-auth/api"

import { affonsoReferralMetadata } from "~/src/integrations/affonso/affonso.referral"
import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { polar } from "~/src/integrations/polar/polar.config"
import { POLAR_CHECKOUT_ID_PLACEHOLDER, POLAR_FIXED_PRICE, POLAR_PRICE_CURRENCY } from "~/src/integrations/polar/polar.constants"
import { localizePathname } from "~/src/integrations/use-intl/i18n.paths"

import { LICENSE_CHECKOUT_METADATA, LICENSE_MUTATION_KEYS, LICENSE_STATUS } from "~/src/modules/license/license.constants"
import { buyerTierPrice } from "~/src/modules/license/license.ppp"
import type { License } from "~/src/modules/license/license.types"
import { upgradePrice } from "~/src/modules/license/license.upgrade-price"
import { canUpgrade, upgradeMetadata } from "~/src/modules/license/license.upgrades"
import { POLAR_PRODUCT_IDS } from "~/src/modules/license/license.utils"
import { licenseZodSchemas } from "~/src/modules/license/license.zod"
import { getLicense } from "~/src/modules/license/use-cases/get-license"

import { toMinorUnits } from "~/src/data/currencies"
import { TIER_PRICES } from "~/src/data/marketing"
import { polarCheckoutLanguage } from "~/src/data/polar"
import { DEFAULT_CURRENCY_CODE } from "~/src/data/pricing"

import { trustedRequestOrigin } from "~/src/lib/request-origin"

import * as ROUTES from "~/src/routes"

interface CheckoutTerms {
  readonly amount: number
  readonly metadata: Record<string, string>
}

const adHocPrices = (productId: string, amount: number): Pick<models.CheckoutCreate, "prices"> => ({
  prices: { [productId]: [{ amount_type: POLAR_FIXED_PRICE, price_amount: amount, price_currency: POLAR_PRICE_CURRENCY }] },
})

const checkoutTerms = async (
  current: License["select"] | undefined,
  tier: License["startCheckout"]["tier"],
  headers: Headers,
): Promise<CheckoutTerms> => {
  if (!canUpgrade(current, tier)) {
    return { amount: toMinorUnits(buyerTierPrice(headers, tier), DEFAULT_CURRENCY_CODE), metadata: {} }
  }

  const upgrade = await upgradePrice(current, tier, headers)

  return { amount: upgrade.amount, metadata: upgradeMetadata({ order: upgrade.fromOrder, tier: upgrade.fromTier }) }
}

export const startCheckout = createServerFn({ method: "POST" })
  .middleware([authorized()])
  .validator((input: License["startCheckout"]) => licenseZodSchemas.startCheckout.parse(input))
  .handler(async ({ context, data: { locale, redirect, returnPath, tier } }) => {
    const origin = trustedRequestOrigin(getRequest())
    const { user } = context.auth
    const current = await getLicense(user.id)

    if (current?.status === LICENSE_STATUS.ACTIVE && !canUpgrade(current, tier)) {
      return { alreadyActive: true } as const
    }

    const terms = await checkoutTerms(current, tier, context.requestHeaders)
    const productId = POLAR_PRODUCT_IDS[tier]
    const purchase = new URLSearchParams({ ...(redirect !== undefined && { redirect }), tier })
    const successUrl = new URL(
      `${localizePathname({ locale, pathname: ROUTES.APP })}?checkoutId=${POLAR_CHECKOUT_ID_PLACEHOLDER}&${purchase.toString()}`,
      origin,
    )
    const { id, url } = await polar.checkouts.create({
      allow_discount_codes: false,
      customer_email: user.email,
      customer_ip_address: getIP(context.requestHeaders, auth.options),
      customer_name: user.name,
      embed_origin: origin,
      external_customer_id: user.id,
      locale: polarCheckoutLanguage(locale),
      metadata: {
        ...affonsoReferralMetadata(context.requestHeaders),
        ...terms.metadata,
        [LICENSE_CHECKOUT_METADATA.LOCALE]: locale,
      },
      products: [productId],
      return_url: new URL(returnPath, origin).toString(),
      success_url: successUrl.toString(),
      ...(terms.amount !== toMinorUnits(TIER_PRICES[tier], DEFAULT_CURRENCY_CODE) && adHocPrices(productId, terms.amount)),
    })

    return { checkoutId: id, url }
  })

export const startCheckoutMutation = mutationOptions({
  mutationFn: (data: License["startCheckout"]) => startCheckout({ data }),
  mutationKey: LICENSE_MUTATION_KEYS.START_CHECKOUT,
})
