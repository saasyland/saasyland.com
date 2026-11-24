import { describe, expect, it } from "vite-plus/test"

import { COUNTRY_HEADER } from "~/src/modules/_core/constants/api"
import { LICENSE_TIER, LICENSE_TIERS } from "~/src/modules/license/license.constants"
import { buyerTierPrice } from "~/src/modules/license/license.ppp"
import { PPP_COOKIE, PPP_DECLINED } from "~/src/modules/license/license.pricing"

import { TIER_PRICES } from "~/src/data/license"

const headers = (fields: Readonly<Record<string, string>>): Headers => new Headers(fields)

describe("the price a buyer pays for a tier", () => {
  it.each(LICENSE_TIERS)("charges the full %s price where no regional price applies", (tier) => {
    expect(buyerTierPrice(headers({}), tier)).toBe(TIER_PRICES[tier])
    expect(buyerTierPrice(headers({ [COUNTRY_HEADER]: "US" }), tier)).toBe(TIER_PRICES[tier])
  })

  it.each([
    { country: "PT", prices: [199, 319, 719] },
    { country: "pl", prices: [174, 279, 629] },
    { country: "IN", prices: [149, 239, 539] },
    { country: "UA", prices: [124, 199, 449] },
  ])("charges a buyer from $country the regional price in whole dollars, rounded down", ({ country, prices }) => {
    const fromCountry = headers({ [COUNTRY_HEADER]: country })

    expect(LICENSE_TIERS.map((tier) => buyerTierPrice(fromCountry, tier))).toStrictEqual(prices)
  })

  it("charges the full price to a buyer who turned regional pricing off", () => {
    expect(buyerTierPrice(headers({ [COUNTRY_HEADER]: "IN", Cookie: `${PPP_COOKIE}=${PPP_DECLINED}` }), LICENSE_TIER.CORE)).toBe(
      TIER_PRICES[LICENSE_TIER.CORE],
    )
  })
})
