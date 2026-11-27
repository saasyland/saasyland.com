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

type PolarOrderAmounts = Pick<models.Order, "net_amount" | "refunded_tax_amount" | "subtotal_amount">

export const polarOrderAmounts = ({
  net_amount: netAmount,
  refunded_tax_amount: refundedTaxAmount,
  subtotal_amount: subtotalAmount,
}: PolarOrderAmounts) => ({ netAmount, refundedTaxAmount, subtotalAmount })
