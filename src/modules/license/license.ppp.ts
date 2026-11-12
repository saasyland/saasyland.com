import "@tanstack/react-start/server-only"

import { env, waitUntil } from "cloudflare:workers"

import type { models } from "@polar-sh/sdk/2026-10"
import * as zod from "zod"

import { polar } from "~/src/integrations/polar/polar.config"

import { COUNTRY_HEADER } from "~/src/modules/_core/constants/api"
import { PPP_COOKIE, PPP_DECLINED, getPppPercentOff } from "~/src/modules/_core/constants/pricing"

import { readCookie } from "~/src/lib/cookie"

const BASIS_POINTS_PER_PERCENT = 100
const DISCOUNT_PAGE_SIZE = 100
const CACHE_KEY = "polar:regional-discounts"
const REFRESH_AFTER_MS = 300_000

const regionalDiscountSchema = zod.object({
  basisPoints: zod.int(),
  endsAt: zod.string().nullable(),
  id: zod.string(),
  maxRedemptions: zod.int().nullable(),
  productIds: zod.array(zod.string()),
  redemptionsCount: zod.int(),
  startsAt: zod.string().nullable(),
})

const cachedDiscountsSchema = zod.object({ discounts: zod.array(regionalDiscountSchema), fetchedAt: zod.int().nonnegative() })

type RegionalDiscount = zod.infer<typeof regionalDiscountSchema>

type PercentageDiscount = Extract<models.Discount, { basis_points: number }>

const isAutomaticPercentage = (discount: models.Discount): discount is PercentageDiscount =>
  discount.type === "percentage" && discount.code === null

const toRegionalDiscount = (discount: PercentageDiscount): RegionalDiscount => ({
  basisPoints: discount.basis_points,
  endsAt: discount.ends_at,
  id: discount.id,
  maxRedemptions: discount.max_redemptions,
  productIds: discount.products.map((product) => product.id),
  redemptionsCount: discount.redemptions_count,
  startsAt: discount.starts_at,
})

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

const isRedeemableFor =
  (productId: string, now: number) =>
  (discount: RegionalDiscount): boolean =>
    (discount.startsAt === null || Date.parse(discount.startsAt) <= now) &&
    (discount.endsAt === null || Date.parse(discount.endsAt) > now) &&
    (discount.maxRedemptions === null || discount.redemptionsCount < discount.maxRedemptions) &&
    (discount.productIds.length === 0 || discount.productIds.includes(productId))

export const pppDiscountId = async (headers: Headers, productId: string): Promise<string | undefined> => {
  const percentOff = getPppPercentOff(headers.get(COUNTRY_HEADER) ?? undefined)

  if (percentOff === 0 || readCookie({ header: headers.get("Cookie"), name: PPP_COOKIE }) === PPP_DECLINED) {
    return undefined
  }

  const discounts = await regionalDiscounts()
  const redeemable = isRedeemableFor(productId, Date.now())

  return discounts.findLast((discount) => discount.basisPoints === percentOff * BASIS_POINTS_PER_PERCENT && redeemable(discount))?.id
}
