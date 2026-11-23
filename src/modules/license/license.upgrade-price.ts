import "@tanstack/react-start/server-only"

import { env } from "cloudflare:workers"

import type { models } from "@polar-sh/sdk/2026-10"

import { polar } from "~/src/integrations/polar/polar.config"
import { POLAR_MINIMUM_PRICE_AMOUNT, POLAR_ORDER_STATUS } from "~/src/integrations/polar/polar.constants"

import { LICENSE_TIERS, type LicenseTier } from "~/src/modules/license/license.constants"
import { buyerTierPrice } from "~/src/modules/license/license.ppp"
import type { UpgradableLicense } from "~/src/modules/license/license.upgrades"
import { POLAR_PRODUCT_IDS, orderCurrencySchema } from "~/src/modules/license/license.utils"

import { toMinorUnits } from "~/src/data/currencies"
import { DEFAULT_CURRENCY_CODE } from "~/src/data/pricing"

const ORDER_PAGE_SIZE = 100

const PAID_STATUSES: ReadonlySet<string> = new Set([POLAR_ORDER_STATUS.PAID, POLAR_ORDER_STATUS.PARTIALLY_REFUNDED])

interface UpgradePrice {
  readonly amount: number
  readonly credit: number
  readonly fromOrder: string
  readonly fromTier: LicenseTier
  readonly price: number
}

const paidAtPrice = (order: models.Order): number => {
  const charged = order.subtotal_amount - order.discount_amount
  const includedTax = charged - order.net_amount

  return charged - order.refunded_amount - Math.min(order.refunded_tax_amount, includedTax)
}

const licenseCredit = async (polarCustomerId: string): Promise<number> => {
  const orders = await Array.fromAsync(
    polar.orders.iterList({
      customer_id: polarCustomerId,
      limit: ORDER_PAGE_SIZE,
      organization_id: env.POLAR_ORGANIZATION_ID,
      product_id: LICENSE_TIERS.map((tier) => POLAR_PRODUCT_IDS[tier]),
    }),
  )

  return orders
    .filter((order) => PAID_STATUSES.has(order.status) && orderCurrencySchema.parse(order.currency) === DEFAULT_CURRENCY_CODE)
    .reduce((credit, order) => credit + paidAtPrice(order), 0)
}

export const upgradePrice = async (license: UpgradableLicense, tier: LicenseTier, headers: Headers): Promise<UpgradePrice> => {
  const price = toMinorUnits(buyerTierPrice(headers, tier), DEFAULT_CURRENCY_CODE)
  const credit = await licenseCredit(license.polarCustomerId)
  const remaining = price - credit

  return {
    amount: remaining < POLAR_MINIMUM_PRICE_AMOUNT ? 0 : remaining,
    credit,
    fromOrder: license.polarOrderId,
    fromTier: license.tier,
    price,
  }
}
