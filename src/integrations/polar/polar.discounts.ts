import type { models } from "@polar-sh/sdk/2026-10"
import * as zod from "zod"

export const BASIS_POINTS_PER_PERCENT = 100

export const POLAR_DISCOUNT_TYPE = {
  FIXED: "fixed",
  PERCENTAGE: "percentage",
} as const satisfies Record<string, models.DiscountType>

export const regionalDiscountSchema = zod.object({
  basisPoints: zod.int(),
  endsAt: zod.string().nullable(),
  id: zod.string(),
  maxRedemptions: zod.int().nullable(),
  productIds: zod.array(zod.string()),
  redemptionsCount: zod.int(),
  startsAt: zod.string().nullable(),
})

export type RegionalDiscount = zod.infer<typeof regionalDiscountSchema>

type PercentageDiscount = Extract<models.Discount, { basis_points: number }>

interface RegionalDiscountQuery {
  readonly now: number
  readonly percentOff: number
  readonly productId: string
}

export const isAutomaticPercentage = (discount: models.Discount): discount is PercentageDiscount =>
  discount.type === POLAR_DISCOUNT_TYPE.PERCENTAGE && discount.code === null

export const toRegionalDiscount = (discount: PercentageDiscount): RegionalDiscount => ({
  basisPoints: discount.basis_points,
  endsAt: discount.ends_at,
  id: discount.id,
  maxRedemptions: discount.max_redemptions,
  productIds: discount.products.map((product) => product.id),
  redemptionsCount: discount.redemptions_count,
  startsAt: discount.starts_at,
})

const isRedeemable = (discount: RegionalDiscount, { now, productId }: RegionalDiscountQuery): boolean =>
  (discount.startsAt === null || Date.parse(discount.startsAt) <= now) &&
  (discount.endsAt === null || Date.parse(discount.endsAt) > now) &&
  (discount.maxRedemptions === null || discount.redemptionsCount < discount.maxRedemptions) &&
  (discount.productIds.length === 0 || discount.productIds.includes(productId))

export const findRegionalDiscount = (discounts: readonly RegionalDiscount[], query: RegionalDiscountQuery): RegionalDiscount | undefined =>
  discounts.findLast((discount) => discount.basisPoints === query.percentOff * BASIS_POINTS_PER_PERCENT && isRedeemable(discount, query))
