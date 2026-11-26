import { describe, expect, it } from "vite-plus/test"

import { JSON_NULL } from "~/src/platform/testing/lib/json-null"
import { createPolarOrder, revokePolarScope } from "~/src/platform/testing/mocks/polar"
import { takeProviderRefusals } from "~/src/platform/testing/mocks/providers"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { POLAR_MINIMUM_PRICE_AMOUNT, POLAR_ORDER_STATUS, POLAR_SCOPE } from "~/src/integrations/polar/polar.constants"

import { COUNTRY_HEADER } from "~/src/modules/_core/constants/api"
import { toMinorUnits } from "~/src/modules/_core/constants/currency"
import { DEFAULT_CURRENCY_CODE } from "~/src/modules/_core/constants/pricing"
import { licenseRow } from "~/src/modules/license/__test__/fixtures/license-row"
import { LICENSE_TIER, type LicenseTier } from "~/src/modules/license/license.constants"
import { buyerTierPrice } from "~/src/modules/license/license.ppp"
import { upgradePrice } from "~/src/modules/license/license.upgrade-price"
import { POLAR_PRODUCT_IDS } from "~/src/modules/license/license.utils"
import { orderRow } from "~/src/modules/order/__test__/fixtures/order"
import { order } from "~/src/modules/order/order.schema"
import type { Order } from "~/src/modules/order/order.types"

const INCLUDED_VAT_RATE = 0.23
const REGIONAL_COUNTRY = "IN"
const ANYWHERE = new Headers()
const FROM_REGION = new Headers({ [COUNTRY_HEADER]: REGIONAL_COUNTRY })
const FIRST_ORDER_ID = "polar-order-first"

const priceIn = (headers: Headers, tier: LicenseTier): number => toMinorUnits(buyerTierPrice(headers, tier), DEFAULT_CURRENCY_CODE)

const CORE_PRICE = priceIn(ANYWHERE, LICENSE_TIER.CORE)
const COMPLETE_PRICE = priceIn(ANYWHERE, LICENSE_TIER.COMPLETE)

const coreHolder = () => ({
  ...licenseRow({ polarCustomerId: crypto.randomUUID() }),
  polarLicenseKeyId: "polar-license-key-first",
  polarOrderId: FIRST_ORDER_ID,
})

const copyOrder = async (customerId: string, overrides: Partial<Order["insert"]> = {}): Promise<void> => {
  await db.insert(order).values(
    orderRow({
      customerId,
      discountAmount: 0,
      netAmount: CORE_PRICE,
      productId: POLAR_PRODUCT_IDS[LICENSE_TIER.CORE],
      refundedTaxAmount: 0,
      subtotalAmount: CORE_PRICE,
      totalAmount: CORE_PRICE,
      ...overrides,
    }),
  )
}

const includedTax = (price: number): number => Math.round(price - price / (1 + INCLUDED_VAT_RATE))

describe("the price of an upgrade", () => {
  it("charges the higher tier's price less what the licence orders charged, read from their copies without asking Polar", async () => {
    const license = coreHolder()
    await copyOrder(license.polarCustomerId)
    revokePolarScope(POLAR_SCOPE.ORDERS)

    await expect(upgradePrice(license, LICENSE_TIER.COMPLETE, ANYWHERE)).resolves.toStrictEqual({
      amount: COMPLETE_PRICE - CORE_PRICE,
      credit: CORE_PRICE,
      fromOrder: FIRST_ORDER_ID,
      fromTier: LICENSE_TIER.CORE,
      price: COMPLETE_PRICE,
    })
  })

  it("counts only the customer's paid or partly refunded licence orders in US dollars", async () => {
    const license = coreHolder()
    const customerId = license.polarCustomerId
    await copyOrder(customerId)
    await copyOrder(customerId, { refundedAmount: CORE_PRICE / 2, status: POLAR_ORDER_STATUS.PARTIALLY_REFUNDED })
    await copyOrder(customerId, { refundedAmount: CORE_PRICE, status: POLAR_ORDER_STATUS.REFUNDED })
    await copyOrder(customerId, { status: POLAR_ORDER_STATUS.PENDING })
    await copyOrder(customerId, { currency: "eur" })
    await copyOrder(customerId, { productId: crypto.randomUUID() })
    await copyOrder(crypto.randomUUID())

    await expect(upgradePrice(license, LICENSE_TIER.COMPLETE, ANYWHERE)).resolves.toMatchObject({
      credit: CORE_PRICE + CORE_PRICE / 2,
    })
  })

  it("credits a price that included tax at what it charged, less what was refunded of it and of its tax", async () => {
    const license = coreHolder()
    const tax = includedTax(CORE_PRICE)
    const refunded = Math.floor((CORE_PRICE - tax) / 2)
    const refundedTax = Math.floor(tax / 2)
    await copyOrder(license.polarCustomerId, {
      netAmount: CORE_PRICE - tax,
      refundedAmount: refunded,
      refundedTaxAmount: refundedTax,
      status: POLAR_ORDER_STATUS.PARTIALLY_REFUNDED,
    })

    await expect(upgradePrice(license, LICENSE_TIER.COMPLETE, ANYWHERE)).resolves.toMatchObject({
      credit: CORE_PRICE - refunded - refundedTax,
    })
  })

  it("credits a price that left tax out at the price alone, whatever tax was refunded on top of it", async () => {
    const license = coreHolder()
    const refunded = Math.floor(CORE_PRICE / 4)
    await copyOrder(license.polarCustomerId, {
      refundedAmount: refunded,
      refundedTaxAmount: includedTax(refunded),
      status: POLAR_ORDER_STATUS.PARTIALLY_REFUNDED,
    })

    await expect(upgradePrice(license, LICENSE_TIER.COMPLETE, ANYWHERE)).resolves.toMatchObject({ credit: CORE_PRICE - refunded })
  })

  it("credits a discounted order at its price less the discount, tax included", async () => {
    const license = coreHolder()
    const discount = Math.floor(CORE_PRICE / 4)
    const charged = CORE_PRICE - discount
    await copyOrder(license.polarCustomerId, { discountAmount: discount, netAmount: charged - includedTax(charged), totalAmount: charged })

    await expect(upgradePrice(license, LICENSE_TIER.COMPLETE, ANYWHERE)).resolves.toMatchObject({ credit: charged })
  })

  it("charges a regional buyer the regional price of the higher tier less the regional price paid", async () => {
    const license = coreHolder()
    const paid = priceIn(FROM_REGION, LICENSE_TIER.CORE)
    await copyOrder(license.polarCustomerId, { netAmount: paid, subtotalAmount: paid, totalAmount: paid })
    const price = priceIn(FROM_REGION, LICENSE_TIER.AGENCY)

    await expect(upgradePrice(license, LICENSE_TIER.AGENCY, FROM_REGION)).resolves.toMatchObject({
      amount: price - paid,
      credit: paid,
      price,
    })
  })

  it("asks nothing when less than Polar's minimum price is left to pay", async () => {
    const license = coreHolder()
    const almost = COMPLETE_PRICE - POLAR_MINIMUM_PRICE_AMOUNT + 1
    await copyOrder(license.polarCustomerId, { netAmount: almost, subtotalAmount: almost, totalAmount: almost })

    await expect(upgradePrice(license, LICENSE_TIER.COMPLETE, ANYWHERE)).resolves.toMatchObject({ amount: 0 })
  })
})

const copyWithoutAmounts = async (license: ReturnType<typeof coreHolder>) => {
  const live = createPolarOrder(
    { externalCustomerId: license.polarCustomerId, productId: POLAR_PRODUCT_IDS[LICENSE_TIER.CORE] },
    { discount_amount: POLAR_MINIMUM_PRICE_AMOUNT, net_amount: CORE_PRICE - POLAR_MINIMUM_PRICE_AMOUNT, refunded_amount: 1 },
  )
  await copyOrder(license.polarCustomerId, {
    discountAmount: JSON_NULL,
    id: live.id,
    netAmount: JSON_NULL,
    refundedTaxAmount: JSON_NULL,
    subtotalAmount: JSON_NULL,
  })
}

describe("the price of an upgrade from an order copied before the copy kept its amounts", () => {
  it("reads that order's amounts from Polar until the backfill has copied them", async () => {
    const license = coreHolder()
    await copyWithoutAmounts(license)

    await expect(upgradePrice(license, LICENSE_TIER.COMPLETE, ANYWHERE)).resolves.toMatchObject({
      credit: CORE_PRICE - POLAR_MINIMUM_PRICE_AMOUNT - 1,
    })
  })

  it("fails rather than credit less than was paid while Polar cannot answer", async () => {
    const license = coreHolder()
    await copyWithoutAmounts(license)
    revokePolarScope(POLAR_SCOPE.ORDERS)

    await expect(upgradePrice(license, LICENSE_TIER.COMPLETE, ANYWHERE)).rejects.toThrow()
    expect(takeProviderRefusals()).toStrictEqual([expect.stringContaining(`the token lacks the ${POLAR_SCOPE.ORDERS} scope`)])
  })
})
