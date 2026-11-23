import { FIRST_USE, type FirstUse, REFUND_ELIGIBILITY } from "~/src/modules/license/license.constants"
import type { License } from "~/src/modules/license/license.types"

import { REFUND_TERMS } from "~/src/data/refunds"

import { MILLISECONDS_PER_DAY } from "~/src/lib/duration"

type UseRecords = Pick<License["select"], "deliveredAt" | "lessonOpenedAt">

interface RefundEligibilityInput extends UseRecords, Pick<License["select"], "purchaseCreatedAt" | "withdrawalConsentAt"> {
  readonly now: Date
}

interface Use {
  readonly usedAt: Date
  readonly via: FirstUse
}

type RefundEligibility =
  | { readonly endedAt: Date; readonly kind: typeof REFUND_ELIGIBILITY.EXPIRED }
  | { readonly kind: typeof REFUND_ELIGIBILITY.REFUNDABLE; readonly until: Date }
  | { readonly kind: typeof REFUND_ELIGIBILITY.STATUTORY_WITHDRAWAL; readonly until: Date }
  | (Use & { readonly kind: typeof REFUND_ELIGIBILITY.USED })

export const refundDeadline = (purchaseCreatedAt: Date): Date =>
  new Date(purchaseCreatedAt.getTime() + REFUND_TERMS.WITHDRAWAL_DAYS * MILLISECONDS_PER_DAY)

const firstUse = ({ deliveredAt, lessonOpenedAt }: UseRecords): Use | undefined =>
  [
    { usedAt: deliveredAt, via: FIRST_USE.TEMPLATES },
    { usedAt: lessonOpenedAt, via: FIRST_USE.LESSON },
  ]
    .filter((use): use is Use => use.usedAt !== null)
    .toSorted((first, second) => first.usedAt.getTime() - second.usedAt.getTime())
    .at(0)

export const refundEligibility = ({
  now,
  purchaseCreatedAt,
  withdrawalConsentAt,
  ...records
}: RefundEligibilityInput): RefundEligibility => {
  const until = refundDeadline(purchaseCreatedAt)

  if (now >= until) {
    return { endedAt: until, kind: REFUND_ELIGIBILITY.EXPIRED }
  }

  if (withdrawalConsentAt === null) {
    return { kind: REFUND_ELIGIBILITY.STATUTORY_WITHDRAWAL, until }
  }

  const use = firstUse(records)

  if (use === undefined) {
    return { kind: REFUND_ELIGIBILITY.REFUNDABLE, until }
  }

  return { ...use, kind: REFUND_ELIGIBILITY.USED }
}

type RefundEligibilityValues = { readonly date: Date } | { readonly date: Date; readonly via: FirstUse }

export const refundEligibilityValues = (refund: RefundEligibility): RefundEligibilityValues => {
  if (refund.kind === REFUND_ELIGIBILITY.EXPIRED) {
    return { date: refund.endedAt }
  }

  if (refund.kind === REFUND_ELIGIBILITY.USED) {
    return { date: refund.usedAt, via: refund.via }
  }

  return { date: refund.until }
}
