import { expect, it } from "vite-plus/test"

import { AFFILIATE_TERMS } from "~/src/data/affiliates"
import { REFUND_TERMS } from "~/src/data/refunds"

it("holds each commission for longer than the refund period, so a refunded order never pays a commission", () => {
  expect(AFFILIATE_TERMS.HOLD_DAYS).toBeGreaterThan(REFUND_TERMS.WITHDRAWAL_DAYS)
})
