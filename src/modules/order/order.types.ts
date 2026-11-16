import type { order } from "~/src/modules/order/order.schema"

export interface Order {
  select: typeof order.$inferSelect
  insert: typeof order.$inferInsert
}
