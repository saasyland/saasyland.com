import { describe, expect, it } from "vite-plus/test"

import { REFUND_ELIGIBILITY } from "~/src/modules/license/license.constants"
import { refundDeadline, refundEligibility } from "~/src/modules/license/license.refunds"

import { REFUND_TERMS } from "~/src/data/refunds"

import { MILLISECONDS_PER_DAY, MILLISECONDS_PER_SECOND } from "~/src/lib/duration"

const PURCHASED_AT = new Date("2026-11-02T15:30:00.000Z")
const PERIOD_END = new Date(PURCHASED_AT.getTime() + REFUND_TERMS.WITHDRAWAL_DAYS * MILLISECONDS_PER_DAY)
const LAST_SECOND = new Date(PERIOD_END.getTime() - MILLISECONDS_PER_SECOND)
const MIDWAY = new Date(PURCHASED_AT.getTime() + MILLISECONDS_PER_DAY)
const LATER = new Date(PERIOD_END.getTime() + MILLISECONDS_PER_DAY)
const DELIVERED_AT = new Date(PURCHASED_AT.getTime() + MILLISECONDS_PER_SECOND)

const WITHIN_THE_PERIOD = [
  { moment: "at the purchase", now: PURCHASED_AT },
  { moment: "a day later", now: MIDWAY },
  { moment: "in its last second", now: LAST_SECOND },
]

const AFTER_THE_PERIOD = [
  { moment: "the moment the period ends", now: PERIOD_END },
  { moment: "a day after the period", now: LATER },
]

const RECORDS = [
  { deliveredAt: null, record: "neither consent nor a delivery", withdrawalConsentAt: null },
  { deliveredAt: DELIVERED_AT, record: "a delivery without consent", withdrawalConsentAt: null },
  { deliveredAt: null, record: "consent and no delivery", withdrawalConsentAt: PURCHASED_AT },
  { deliveredAt: DELIVERED_AT, record: "consent and a delivery", withdrawalConsentAt: PURCHASED_AT },
]

describe("refund eligibility", () => {
  it("counts the period in whole days from the purchase", () => {
    expect(PERIOD_END.getTime() - PURCHASED_AT.getTime()).toBe(REFUND_TERMS.WITHDRAWAL_DAYS * MILLISECONDS_PER_DAY)
    expect(refundDeadline(PURCHASED_AT)).toStrictEqual(PERIOD_END)
  })

  it.each(WITHIN_THE_PERIOD)(
    "is refundable until the period ends $moment when the buyer consented and nothing was delivered",
    ({ now }) => {
      expect(
        refundEligibility({ deliveredAt: null, now, purchaseCreatedAt: PURCHASED_AT, withdrawalConsentAt: PURCHASED_AT }),
      ).toStrictEqual({
        kind: REFUND_ELIGIBILITY.REFUNDABLE,
        until: PERIOD_END,
      })
    },
  )

  it.each(WITHIN_THE_PERIOD)(
    "is used $moment once templates were delivered after the buyer consented, and names the delivery",
    ({ now }) => {
      expect(
        refundEligibility({ deliveredAt: DELIVERED_AT, now, purchaseCreatedAt: PURCHASED_AT, withdrawalConsentAt: PURCHASED_AT }),
      ).toStrictEqual({ deliveredAt: DELIVERED_AT, kind: REFUND_ELIGIBILITY.USED })
    },
  )

  it.each(WITHIN_THE_PERIOD)("leaves the statutory withdrawal open $moment when no consent was recorded, used or not", ({ now }) => {
    for (const deliveredAt of [null, DELIVERED_AT]) {
      expect(refundEligibility({ deliveredAt, now, purchaseCreatedAt: PURCHASED_AT, withdrawalConsentAt: null })).toStrictEqual({
        kind: REFUND_ELIGIBILITY.STATUTORY_WITHDRAWAL,
        until: PERIOD_END,
      })
    }
  })

  describe.each(AFTER_THE_PERIOD)("$moment", ({ now }) => {
    it.each(RECORDS)("has expired with $record, and names when the period ended", ({ deliveredAt, withdrawalConsentAt }) => {
      expect(refundEligibility({ deliveredAt, now, purchaseCreatedAt: PURCHASED_AT, withdrawalConsentAt })).toStrictEqual({
        endedAt: PERIOD_END,
        kind: REFUND_ELIGIBILITY.EXPIRED,
      })
    })
  })

  it("treats a purchase whose date was never recorded as long expired", () => {
    const unknown = new Date(0)

    expect(refundEligibility({ deliveredAt: null, now: MIDWAY, purchaseCreatedAt: unknown, withdrawalConsentAt: null })).toStrictEqual({
      endedAt: new Date(REFUND_TERMS.WITHDRAWAL_DAYS * MILLISECONDS_PER_DAY),
      kind: REFUND_ELIGIBILITY.EXPIRED,
    })
  })
})
