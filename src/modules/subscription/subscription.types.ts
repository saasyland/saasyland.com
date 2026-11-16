import type { subscription } from "~/src/modules/subscription/subscription.schema"

export interface Subscription {
  select: typeof subscription.$inferSelect
  insert: typeof subscription.$inferInsert
}
