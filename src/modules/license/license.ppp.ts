import "@tanstack/react-start/server-only"

import { env } from "cloudflare:workers"

import type { models } from "@polar-sh/sdk/2026-10"

import { polar } from "~/src/integrations/polar/polar.config"

import { COUNTRY_HEADER } from "~/src/modules/_core/constants/api"
import { PPP_COOKIE, PPP_DECLINED, getPppPercentOff } from "~/src/modules/_core/constants/pricing"

import { readCookie } from "~/src/lib/cookie"

const BASIS_POINTS_PER_PERCENT = 100
const DISCOUNT_PAGE_SIZE = 100
const DISCOUNT_CACHE_MINUTES = 5
const SECONDS_PER_MINUTE = 60
const MILLISECONDS_PER_SECOND = 1000
const DISCOUNT_CACHE_MS = DISCOUNT_CACHE_MINUTES * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND

type PercentageDiscount = Extract<models.Discount, { basis_points: number }>

const isAutomaticPercentage = (discount: models.Discount): discount is PercentageDiscount =>
  discount.type === "percentage" && discount.code === null

const cache: { discounts?: Promise<readonly PercentageDiscount[]>; expiresAt: number } = { expiresAt: 0 }

const loadDiscounts = async (): Promise<readonly PercentageDiscount[]> => {
  const found: PercentageDiscount[] = []

  try {
    for await (const discount of polar.discounts.iterList({ limit: DISCOUNT_PAGE_SIZE, organization_id: env.POLAR_ORGANIZATION_ID })) {
      if (isAutomaticPercentage(discount)) {
        found.push(discount)
      }
    }
  } catch {
    cache.expiresAt = 0
    return found
  }

  cache.expiresAt = Date.now() + DISCOUNT_CACHE_MS
  return found
}

export const pppDiscountId = async (headers: Headers, productId: string): Promise<string | undefined> => {
  const percentOff = getPppPercentOff(headers.get(COUNTRY_HEADER) ?? undefined)

  if (percentOff === 0 || readCookie({ header: headers.get("Cookie"), name: PPP_COOKIE }) === PPP_DECLINED) {
    return undefined
  }

  if (!cache.discounts || cache.expiresAt <= Date.now()) {
    cache.expiresAt = Infinity
    cache.discounts = loadDiscounts()
  }
  const discounts = await cache.discounts
  const now = Date.now()

  return discounts.findLast(
    (discount) =>
      discount.basis_points === percentOff * BASIS_POINTS_PER_PERCENT &&
      (discount.starts_at === null || Date.parse(discount.starts_at) <= now) &&
      (discount.ends_at === null || Date.parse(discount.ends_at) > now) &&
      (discount.max_redemptions === null || discount.redemptions_count < discount.max_redemptions) &&
      (discount.products.length === 0 || discount.products.some((product) => product.id === productId)),
  )?.id
}
