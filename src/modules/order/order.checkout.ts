import "@tanstack/react-start/server-only"

import type { models } from "@polar-sh/sdk/2026-10"
import { getRequest } from "@tanstack/react-start/server"
import { getIP } from "better-auth/api"

import { affonsoReferralMetadata } from "~/src/integrations/affonso/affonso.referral"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { polar } from "~/src/integrations/polar/polar.config"
import { POLAR_CHECKOUT_ID_PLACEHOLDER, polarCheckoutLanguage } from "~/src/integrations/polar/polar.constants"
import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { localizePathname } from "~/src/integrations/use-intl/i18n.paths"

import { POLAR_PRODUCT_IDS } from "~/src/modules/license/license.utils"
import { ORDER_CHECKOUT_METADATA } from "~/src/modules/order/order.constants"
import type { Order } from "~/src/modules/order/order.types"
import type { User } from "~/src/modules/user/user.types"

import { trustedRequestOrigin } from "~/src/lib/request-origin"

export type CheckoutTerms = Pick<models.CheckoutCreate, "allow_discount_codes" | "metadata" | "prices">

interface CheckoutContext {
  readonly auth: { readonly user: Pick<User["select"], "email" | "id" | "name"> }
  readonly requestHeaders: Headers
}

interface StartedCheckout {
  readonly checkoutId: string
  readonly url: string
}

const PRODUCTS_WITH_OWN_CHECKOUT: readonly (readonly string[])[] = [Object.values(POLAR_PRODUCT_IDS)]

export const hasOwnCheckout = (productId: string): boolean => PRODUCTS_WITH_OWN_CHECKOUT.some((products) => products.includes(productId))

const successUrl = (origin: string, locale: SupportedLocale, successPath: string): string => {
  const { pathname, search } = new URL(successPath, origin)
  const query = [`checkoutId=${POLAR_CHECKOUT_ID_PLACEHOLDER}`, search.slice(1)].filter((part) => part.length > 0)

  return `${origin}${localizePathname({ locale, pathname })}?${query.join("&")}`
}

export const createCheckout = async (
  { auth: { user }, requestHeaders }: CheckoutContext,
  { locale, productId, returnPath, successPath }: Order["startCheckout"],
  terms: CheckoutTerms = {},
): Promise<StartedCheckout> => {
  const origin = trustedRequestOrigin(getRequest())
  const { id, url } = await polar.checkouts.create({
    allow_discount_codes: true,
    customer_email: user.email,
    customer_ip_address: getIP(requestHeaders, auth.options),
    customer_name: user.name,
    embed_origin: origin,
    external_customer_id: user.id,
    locale: polarCheckoutLanguage(locale),
    products: [productId],
    return_url: new URL(returnPath, origin).toString(),
    success_url: successUrl(origin, locale, successPath),
    ...terms,
    metadata: { ...affonsoReferralMetadata(requestHeaders), ...terms.metadata, [ORDER_CHECKOUT_METADATA.LOCALE]: locale },
  })

  return { checkoutId: id, url }
}
