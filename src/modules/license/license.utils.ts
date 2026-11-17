import "@tanstack/react-start/server-only"

import { env } from "cloudflare:workers"

import { createTranslator } from "use-intl"
import * as zod from "zod"

import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"

import { CURRENCY_CODES } from "~/src/modules/_core/constants/currency"
import { LICENSE_TIER, LICENSE_TIERS, type LicenseTier } from "~/src/modules/license/license.constants"

import { POLAR_DASHBOARD_HOSTS, POLAR_ORGANIZATION_SLUG } from "~/src/data/polar"

import type pricingMessages from "~/messages/en-US/components.custom.pricing.json"

export const POLAR_PRODUCT_IDS = {
  [LICENSE_TIER.AGENCY]: env.POLAR_PRODUCT_ID_AGENCY,
  [LICENSE_TIER.COMPLETE]: env.POLAR_PRODUCT_ID_COMPLETE,
  [LICENSE_TIER.CORE]: env.POLAR_PRODUCT_ID_CORE,
} as const satisfies Record<LicenseTier, string>

export const licenseTierForProduct = (productId: string): LicenseTier | undefined =>
  LICENSE_TIERS.find((tier) => POLAR_PRODUCT_IDS[tier] === productId)

export const orderCurrencySchema = zod.string().toUpperCase().pipe(zod.enum(CURRENCY_CODES))

export const polarOrderUrl = (orderId: string): string =>
  new URL(
    `/dashboard/${POLAR_ORGANIZATION_SLUG}/sales/${encodeURIComponent(orderId)}`,
    `https://${POLAR_DASHBOARD_HOSTS[env.POLAR_SERVER]}`,
  ).toString()

export const localizedTierName = async (locale: SupportedLocale, tier: LicenseTier): Promise<string> => {
  const messages = await loadNamespace<typeof pricingMessages>({ locale, namespace: "components.custom.pricing" })

  return createTranslator({ locale, messages })(`tiers.${tier}.name`)
}
