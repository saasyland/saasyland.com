import { eq } from "drizzle-orm"

import type { AreaRows } from "~/src/integrations/drizzle-orm/__test__/rows"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { orderRow } from "~/src/modules/order/__test__/fixtures/order"
import { order } from "~/src/modules/order/order.schema"
import { subscriptionRow } from "~/src/modules/subscription/__test__/fixtures/subscription"
import { subscription } from "~/src/modules/subscription/subscription.schema"

export const POLAR_ROWS = [
  {
    insert: ({ userId }) => [db.insert(order).values(orderRow({ userId })).returning()],
    owned: (userId) => db.select().from(order).where(eq(order.userId, userId)),
  },
  {
    insert: ({ userId }) => [db.insert(subscription).values(subscriptionRow({ userId })).returning()],
    owned: (userId) => db.select().from(subscription).where(eq(subscription.userId, userId)),
  },
] as const satisfies readonly AreaRows[]
