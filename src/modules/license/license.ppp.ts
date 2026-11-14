import "@tanstack/react-start/server-only"

import { env, waitUntil } from "cloudflare:workers"

import * as zod from "zod"

import { polar } from "~/src/integrations/polar/polar.config"
import {
  type RegionalDiscount,
  findRegionalDiscount,
  isAutomaticPercentage,
  regionalDiscountSchema,
  toRegionalDiscount,
} from "~/src/integrations/polar/polar.discounts"

import { COUNTRY_HEADER } from "~/src/modules/_core/constants/api"
import { PPP_COOKIE, PPP_DECLINED, getPppPercentOff } from "~/src/modules/_core/constants/pricing"

import { readCookie } from "~/src/lib/cookie"

const DISCOUNT_PAGE_SIZE = 100
const CACHE_KEY = "polar:regional-discounts"
const REFRESH_AFTER_MS = 300_000

const cachedDiscountsSchema = zod.object({ discounts: zod.array(regionalDiscountSchema), fetchedAt: zod.int().nonnegative() })

const countryHeaderSchema = zod.string()

const fetchDiscounts = async (): Promise<readonly RegionalDiscount[]> => {
  const discounts: RegionalDiscount[] = []

  try {
    for await (const discount of polar.discounts.iterList({ limit: DISCOUNT_PAGE_SIZE, organization_id: env.POLAR_ORGANIZATION_ID })) {
      if (isAutomaticPercentage(discount)) {
        discounts.push(toRegionalDiscount(discount))
      }
    }
  } catch (error) {
    console.error("[ppp] Polar discounts could not be listed; checkout continues with the discounts found so far", error)
    return discounts
  }

  const entry = JSON.stringify({ discounts, fetchedAt: Date.now() })
  waitUntil(env.CACHE.put(CACHE_KEY, entry))

  return discounts
}

const regionalDiscounts = async (): Promise<readonly RegionalDiscount[]> => {
  const cached = cachedDiscountsSchema.safeParse(await env.CACHE.get(CACHE_KEY, "json")).data

  if (cached !== undefined && Date.now() - cached.fetchedAt < REFRESH_AFTER_MS) {
    return cached.discounts
  }

  return fetchDiscounts()
}

export const pppDiscountId = async (headers: Headers, productId: string): Promise<string | undefined> => {
  const percentOff = getPppPercentOff(countryHeaderSchema.safeParse(headers.get(COUNTRY_HEADER)).data)

  if (percentOff === 0 || readCookie({ header: headers.get("Cookie"), name: PPP_COOKIE }) === PPP_DECLINED) {
    return undefined
  }

  return findRegionalDiscount(await regionalDiscounts(), { now: Date.now(), percentOff, productId })?.id
}
