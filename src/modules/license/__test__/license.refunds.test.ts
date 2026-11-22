import { describe, expect, it } from "vite-plus/test"

import { FIRST_USE, REFUND_ELIGIBILITY } from "~/src/modules/license/license.constants"
import { refundDeadline, refundEligibility, refundEligibilityValues } from "~/src/modules/license/license.refunds"

import { REFUND_TERMS } from "~/src/data/refunds"

import { MILLISECONDS_PER_DAY, MILLISECONDS_PER_SECOND } from "~/src/lib/duration"

const PURCHASED_AT = new Date("2026-11-02T15:30:00.000Z")
const PERIOD_END = new Date(PURCHASED_AT.getTime() + REFUND_TERMS.WITHDRAWAL_DAYS * MILLISECONDS_PER_DAY)
const LAST_SECOND = new Date(PERIOD_END.getTime() - MILLISECONDS_PER_SECOND)
const MIDWAY = new Date(PURCHASED_AT.getTime() + MILLISECONDS_PER_DAY)
const LATER = new Date(PERIOD_END.getTime() + MILLISECONDS_PER_DAY)
const DELIVERED_AT = new Date(PURCHASED_AT.getTime() + MILLISECONDS_PER_SECOND)
const LESSON_OPENED_AT = new Date(PURCHASED_AT.getTime() + 2 * MILLISECONDS_PER_SECOND)
const EARLIER_LESSON_AT = new Date(PURCHASED_AT.getTime() + MILLISECONDS_PER_SECOND / 2)

const UNUSED = { deliveredAt: null, lessonOpenedAt: null }

const WITHIN_THE_PERIOD = [
  { moment: "at the purchase", now: PURCHASED_AT },
  { moment: "a day later", now: MIDWAY },
  { moment: "in its last second", now: LAST_SECOND },
]

const AFTER_THE_PERIOD = [
  { moment: "the moment the period ends", now: PERIOD_END },
  { moment: "a day after the period", now: LATER },
]

const USES = [
  { record: "no use", ...UNUSED },
  { record: "a template download", ...UNUSED, deliveredAt: DELIVERED_AT },
  { record: "a paid lesson", ...UNUSED, lessonOpenedAt: LESSON_OPENED_AT },
  { deliveredAt: DELIVERED_AT, lessonOpenedAt: LESSON_OPENED_AT, record: "both" },
]

const RECORDS = USES.flatMap(({ record, ...uses }) => [
  { ...uses, record: `${record} without consent`, withdrawalConsentAt: null },
  { ...uses, record: `${record} after consent`, withdrawalConsentAt: PURCHASED_AT },
])

const FIRST_USES = [
  {
    expected: { usedAt: DELIVERED_AT, via: FIRST_USE.TEMPLATES },
    records: { ...UNUSED, deliveredAt: DELIVERED_AT },
    use: "the CLI downloaded templates",
  },
  {
    expected: { usedAt: LESSON_OPENED_AT, via: FIRST_USE.LESSON },
    records: { ...UNUSED, lessonOpenedAt: LESSON_OPENED_AT },
    use: "a paid lesson was opened",
  },
  {
    expected: { usedAt: DELIVERED_AT, via: FIRST_USE.TEMPLATES },
    records: { deliveredAt: DELIVERED_AT, lessonOpenedAt: LESSON_OPENED_AT },
    use: "templates came before a paid lesson",
  },
  {
    expected: { usedAt: EARLIER_LESSON_AT, via: FIRST_USE.LESSON },
    records: { deliveredAt: DELIVERED_AT, lessonOpenedAt: EARLIER_LESSON_AT },
    use: "a paid lesson came before templates",
  },
  {
    expected: { usedAt: DELIVERED_AT, via: FIRST_USE.TEMPLATES },
    records: { deliveredAt: DELIVERED_AT, lessonOpenedAt: DELIVERED_AT },
    use: "both happened at the same moment",
  },
]

describe("refund eligibility", () => {
  it("counts the period in whole days from the purchase", () => {
    expect(PERIOD_END.getTime() - PURCHASED_AT.getTime()).toBe(REFUND_TERMS.WITHDRAWAL_DAYS * MILLISECONDS_PER_DAY)
    expect(refundDeadline(PURCHASED_AT)).toStrictEqual(PERIOD_END)
  })

  it.each(WITHIN_THE_PERIOD)("is refundable until the period ends $moment when the buyer consented and nothing was used", ({ now }) => {
    expect(refundEligibility({ ...UNUSED, now, purchaseCreatedAt: PURCHASED_AT, withdrawalConsentAt: PURCHASED_AT })).toStrictEqual({
      kind: REFUND_ELIGIBILITY.REFUNDABLE,
      until: PERIOD_END,
    })
  })

  describe.each(WITHIN_THE_PERIOD)("$moment", ({ now }) => {
    it.each(FIRST_USES)("is used after the buyer consented when $use, and names the first use", ({ expected, records }) => {
      expect(refundEligibility({ ...records, now, purchaseCreatedAt: PURCHASED_AT, withdrawalConsentAt: PURCHASED_AT })).toStrictEqual({
        ...expected,
        kind: REFUND_ELIGIBILITY.USED,
      })
    })

    it.each(USES)("leaves the statutory withdrawal open when no consent was recorded, with $record", ({ record: _record, ...uses }) => {
      expect(refundEligibility({ ...uses, now, purchaseCreatedAt: PURCHASED_AT, withdrawalConsentAt: null })).toStrictEqual({
        kind: REFUND_ELIGIBILITY.STATUTORY_WITHDRAWAL,
        until: PERIOD_END,
      })
    })
  })

  describe.each(AFTER_THE_PERIOD)("$moment", ({ now }) => {
    it.each(RECORDS)("has expired with $record, and names when the period ended", ({ record: _record, ...records }) => {
      expect(refundEligibility({ ...records, now, purchaseCreatedAt: PURCHASED_AT })).toStrictEqual({
        endedAt: PERIOD_END,
        kind: REFUND_ELIGIBILITY.EXPIRED,
      })
    })
  })

  it("treats a purchase whose date was never recorded as long expired", () => {
    const unknown = new Date(0)

    expect(refundEligibility({ ...UNUSED, now: MIDWAY, purchaseCreatedAt: unknown, withdrawalConsentAt: null })).toStrictEqual({
      endedAt: new Date(REFUND_TERMS.WITHDRAWAL_DAYS * MILLISECONDS_PER_DAY),
      kind: REFUND_ELIGIBILITY.EXPIRED,
    })
  })
})

describe("refund eligibility values", () => {
  it.each([
    { expected: { date: PERIOD_END }, refund: { endedAt: PERIOD_END, kind: REFUND_ELIGIBILITY.EXPIRED } },
    { expected: { date: PERIOD_END }, refund: { kind: REFUND_ELIGIBILITY.REFUNDABLE, until: PERIOD_END } },
    { expected: { date: PERIOD_END }, refund: { kind: REFUND_ELIGIBILITY.STATUTORY_WITHDRAWAL, until: PERIOD_END } },
    {
      expected: { date: LESSON_OPENED_AT, via: FIRST_USE.LESSON },
      refund: { kind: REFUND_ELIGIBILITY.USED, usedAt: LESSON_OPENED_AT, via: FIRST_USE.LESSON },
    },
  ] as const)("gives the date of $refund.kind and how a used purchase was first used", ({ expected, refund }) => {
    expect(refundEligibilityValues(refund)).toStrictEqual(expected)
  })
})
