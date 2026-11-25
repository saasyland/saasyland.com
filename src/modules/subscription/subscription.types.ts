import type { subscription } from "~/src/modules/subscription/subscription.schema"
import type { getCurrentSubscriptions } from "~/src/modules/subscription/use-cases/get-current-subscriptions"

export interface Subscription {
  select: typeof subscription.$inferSelect
  insert: typeof subscription.$inferInsert
  current: Awaited<ReturnType<typeof getCurrentSubscriptions>>["subscriptions"][number]
}
