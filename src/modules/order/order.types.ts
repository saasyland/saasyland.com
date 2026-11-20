import type * as zod from "zod"

import type { order } from "~/src/modules/order/order.schema"
import type { orderZodSchemas } from "~/src/modules/order/order.zod"
import type { getRevenue } from "~/src/modules/order/use-cases/get-revenue"

export interface Order {
  select: typeof order.$inferSelect
  insert: typeof order.$inferInsert
  revenue: Awaited<ReturnType<typeof getRevenue>>
  currencyRevenue: Awaited<ReturnType<typeof getRevenue>>["currencies"][number]
  getRevenue: zod.input<typeof orderZodSchemas.getRevenue>
}
