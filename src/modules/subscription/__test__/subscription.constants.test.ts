import type { models } from "@polar-sh/sdk/2026-10"
import { expect, expectTypeOf, it } from "vite-plus/test"

import { POLAR_RECURRING_INTERVAL, POLAR_SUBSCRIPTION_STATUS } from "~/src/integrations/polar/polar.constants"

import { SUBSCRIPTION_RECURRING_INTERVALS, SUBSCRIPTION_STATUSES } from "~/src/modules/subscription/subscription.constants"

it("stores every subscription status the Polar SDK names, each once", () => {
  expectTypeOf<(typeof SUBSCRIPTION_STATUSES)[number]>().toEqualTypeOf<models.SubscriptionStatus>()
  expectTypeOf<(typeof POLAR_SUBSCRIPTION_STATUS)[keyof typeof POLAR_SUBSCRIPTION_STATUS]>().toEqualTypeOf<models.SubscriptionStatus>()
  expect(new Set(SUBSCRIPTION_STATUSES).size).toBe(SUBSCRIPTION_STATUSES.length)
  expect(SUBSCRIPTION_STATUSES.toSorted()).toStrictEqual(Object.values(POLAR_SUBSCRIPTION_STATUS).toSorted())
})

it("stores every recurring interval the Polar SDK names, each once", () => {
  expectTypeOf<(typeof SUBSCRIPTION_RECURRING_INTERVALS)[number]>().toEqualTypeOf<models.RecurringInterval>()
  expectTypeOf<(typeof POLAR_RECURRING_INTERVAL)[keyof typeof POLAR_RECURRING_INTERVAL]>().toEqualTypeOf<models.RecurringInterval>()
  expect(new Set(SUBSCRIPTION_RECURRING_INTERVALS).size).toBe(SUBSCRIPTION_RECURRING_INTERVALS.length)
  expect(SUBSCRIPTION_RECURRING_INTERVALS.toSorted()).toStrictEqual(Object.values(POLAR_RECURRING_INTERVAL).toSorted())
})
