import type { models } from "@polar-sh/sdk/2026-10"
import { expect, expectTypeOf, it } from "vite-plus/test"

import { POLAR_ORDER_STATUS } from "~/src/integrations/polar/polar.constants"

import { ORDER_STATUSES } from "~/src/modules/order/order.constants"

it("stores every order status the Polar SDK names, each once", () => {
  expectTypeOf<(typeof ORDER_STATUSES)[number]>().toEqualTypeOf<models.OrderStatus>()
  expectTypeOf<(typeof POLAR_ORDER_STATUS)[keyof typeof POLAR_ORDER_STATUS]>().toEqualTypeOf<models.OrderStatus>()
  expect(new Set(ORDER_STATUSES).size).toBe(ORDER_STATUSES.length)
  expect(ORDER_STATUSES.toSorted()).toStrictEqual(Object.values(POLAR_ORDER_STATUS).toSorted())
})
