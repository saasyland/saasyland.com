import { JSON_NULL } from "~/src/platform/testing/lib/json-null"

import { POLAR_RECURRING_INTERVAL, POLAR_SUBSCRIPTION_STATUS } from "~/src/integrations/polar/polar.constants"

import { DEFAULT_CURRENCY_CODE } from "~/src/modules/_core/constants/pricing"
import type { Subscription } from "~/src/modules/subscription/subscription.types"

export const subscriptionRow = (overrides: Partial<Subscription["insert"]> = {}): Subscription["insert"] => ({
  amount: 2900,
  cancelAtPeriodEnd: false,
  changedAt: new Date("2026-11-16T10:05:00.000Z"),
  currency: DEFAULT_CURRENCY_CODE.toLowerCase(),
  currentPeriodEnd: new Date("2026-12-16T10:00:00.000Z"),
  customerId: crypto.randomUUID(),
  endedAt: JSON_NULL,
  id: crypto.randomUUID(),
  productId: crypto.randomUUID(),
  productName: "Monthly plan",
  recurringInterval: POLAR_RECURRING_INTERVAL.MONTH,
  recurringIntervalCount: 1,
  startedAt: new Date("2026-11-16T10:00:00.000Z"),
  status: POLAR_SUBSCRIPTION_STATUS.ACTIVE,
  userId: JSON_NULL,
  ...overrides,
})
