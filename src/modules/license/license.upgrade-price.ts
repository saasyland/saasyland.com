import "@tanstack/react-start/server-only"

import { and, eq, inArray } from "drizzle-orm"
import * as zod from "zod"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { polar } from "~/src/integrations/polar/polar.config"
import { POLAR_MINIMUM_PRICE_AMOUNT, POLAR_ORDER_STATUS } from "~/src/integrations/polar/polar.constants"

import { toMinorUnits } from "~/src/modules/_core/constants/currency"
import { DEFAULT_CURRENCY_CODE } from "~/src/modules/_core/constants/pricing"
import { LICENSE_TIERS, type LicenseTier } from "~/src/modules/license/license.constants"
import { buyerTierPrice } from "~/src/modules/license/license.ppp"
import type { UpgradableLicense } from "~/src/modules/license/license.upgrades"
import { POLAR_PRODUCT_IDS, orderCurrencySchema } from "~/src/modules/license/license.utils"
import { polarOrderAmounts } from "~/src/modules/order/order.polar"
import { order } from "~/src/modules/order/order.schema"

const chargedAmountsSchema = zod.object({
  discountAmount: zod.number(),
  netAmount: zod.number(),
  refundedAmount: zod.number(),
  refundedTaxAmount: zod.number(),
  subtotalAmount: zod.number(),
})

type ChargedAmounts = zod.output<typeof chargedAmountsSchema>

interface UpgradePrice {
  readonly amount: number
  readonly credit: number
  readonly fromOrder: string
  readonly fromTier: LicenseTier
  readonly price: number
}

const paidAtPrice = ({ discountAmount, netAmount, refundedAmount, refundedTaxAmount, subtotalAmount }: ChargedAmounts): number => {
  const charged = subtotalAmount - discountAmount
  const includedTax = charged - netAmount

  return charged - refundedAmount - Math.min(refundedTaxAmount, includedTax)
}

const licenseOrders = (polarCustomerId: string) => {
  const productIds = LICENSE_TIERS.map((tier) => POLAR_PRODUCT_IDS[tier])

  return db
    .select({
      currency: order.currency,
      discountAmount: order.discountAmount,
      id: order.id,
      netAmount: order.netAmount,
      refundedAmount: order.refundedAmount,
      refundedTaxAmount: order.refundedTaxAmount,
      subtotalAmount: order.subtotalAmount,
    })
    .from(order)
    .where(
      and(
        eq(order.customerId, polarCustomerId),
        inArray(order.productId, productIds),
        inArray(order.status, [POLAR_ORDER_STATUS.PAID, POLAR_ORDER_STATUS.PARTIALLY_REFUNDED]),
      ),
    )
}

type LicenseOrderCopy = Awaited<ReturnType<typeof licenseOrders>>[number]

const chargedAmounts = async (copy: LicenseOrderCopy): Promise<ChargedAmounts> => {
  const copied = chargedAmountsSchema.safeParse(copy)
  if (copied.success) {
    return copied.data
  }

  const live = await polar.orders.get(copy.id)

  return { ...polarOrderAmounts(live), discountAmount: live.discount_amount, refundedAmount: live.refunded_amount }
}

const licenseCredit = async (polarCustomerId: string): Promise<number> => {
  const copies = await licenseOrders(polarCustomerId)
  const amounts = await Promise.all(
    copies.filter(({ currency }) => orderCurrencySchema.parse(currency) === DEFAULT_CURRENCY_CODE).map((copy) => chargedAmounts(copy)),
  )

  return amounts.reduce((credit, charged) => credit + paidAtPrice(charged), 0)
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
