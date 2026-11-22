import type { models } from "@polar-sh/sdk/2026-10"

type PolarOrderTerms = Pick<models.Order, "billing_address" | "discount" | "discount_amount" | "discount_id">

export const polarOrderTerms = ({
  billing_address: billingAddress,
  discount,
  discount_amount: discountAmount,
  discount_id: discountId,
}: PolarOrderTerms) => ({
  billingCountry: billingAddress?.country,
  discountAmount,
  discountCode: discount?.code,
  discountId,
  discountName: discount?.name,
})
