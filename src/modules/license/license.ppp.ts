import "@tanstack/react-start/server-only"

import * as zod from "zod"

import { COUNTRY_HEADER } from "~/src/modules/_core/constants/api"
import type { LicenseTier } from "~/src/modules/license/license.constants"
import { PPP_COOKIE, PPP_DECLINED, PPP_PERCENT, pppMultiplierKey, regionalPrice } from "~/src/modules/license/license.pricing"

import { TIER_PRICES } from "~/src/data/marketing"

import { readCookie } from "~/src/lib/cookie"

const countryHeaderSchema = zod.string()

const buyerMultiplierKey = (headers: Headers): number => {
  if (readCookie({ header: headers.get("Cookie"), name: PPP_COOKIE }) === PPP_DECLINED) {
    return PPP_PERCENT
  }

  return pppMultiplierKey(countryHeaderSchema.safeParse(headers.get(COUNTRY_HEADER)).data)
}

export const buyerTierPrice = (headers: Headers, tier: LicenseTier): number => regionalPrice(TIER_PRICES[tier], buyerMultiplierKey(headers))
