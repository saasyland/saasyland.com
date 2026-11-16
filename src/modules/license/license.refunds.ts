import { REFUND_ELIGIBILITY } from "~/src/modules/license/license.constants"
import type { License } from "~/src/modules/license/license.types"

import { REFUND_TERMS } from "~/src/data/refunds"

import { MILLISECONDS_PER_DAY } from "~/src/lib/duration"

interface RefundEligibilityInput extends Pick<License["select"], "deliveredAt" | "purchaseCreatedAt" | "withdrawalConsentAt"> {
  readonly now: Date
}

export type RefundEligibility =
  | { readonly endedAt: Date; readonly kind: typeof REFUND_ELIGIBILITY.EXPIRED }
  | { readonly kind: typeof REFUND_ELIGIBILITY.REFUNDABLE; readonly until: Date }
  | { readonly kind: typeof REFUND_ELIGIBILITY.STATUTORY_WITHDRAWAL; readonly until: Date }
  | { readonly deliveredAt: Date; readonly kind: typeof REFUND_ELIGIBILITY.USED }

export const refundEligibility = ({
  deliveredAt,
  now,
  purchaseCreatedAt,
  withdrawalConsentAt,
}: RefundEligibilityInput): RefundEligibility => {
  const until = new Date(purchaseCreatedAt.getTime() + REFUND_TERMS.WITHDRAWAL_DAYS * MILLISECONDS_PER_DAY)

  if (now >= until) {
    return { endedAt: until, kind: REFUND_ELIGIBILITY.EXPIRED }
  }

  if (withdrawalConsentAt === null) {
    return { kind: REFUND_ELIGIBILITY.STATUTORY_WITHDRAWAL, until }
  }

  if (deliveredAt === null) {
    return { kind: REFUND_ELIGIBILITY.REFUNDABLE, until }
  }

  return { deliveredAt, kind: REFUND_ELIGIBILITY.USED }
}
