import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { desc, eq } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { moneyOf } from "~/src/modules/order/order.utils"
import { SUBSCRIPTION_QUERY_KEYS } from "~/src/modules/subscription/subscription.constants"
import { subscription } from "~/src/modules/subscription/subscription.schema"

export const getCurrentSubscriptions = createServerFn({ method: "GET" })
  .middleware([authorized()])
  .handler(async ({ context }) => {
    const rows = await db
      .select({
        amount: subscription.amount,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        currency: subscription.currency,
        currentPeriodEnd: subscription.currentPeriodEnd,
        endedAt: subscription.endedAt,
        id: subscription.id,
        productName: subscription.productName,
        recurringInterval: subscription.recurringInterval,
        recurringIntervalCount: subscription.recurringIntervalCount,
        status: subscription.status,
      })
      .from(subscription)
      .where(eq(subscription.userId, context.auth.user.id))
      .orderBy(desc(subscription.currentPeriodEnd), desc(subscription.id))

    return {
      subscriptions: rows.map(
        ({
          amount,
          cancelAtPeriodEnd,
          currency,
          currentPeriodEnd,
          endedAt,
          id,
          productName,
          recurringInterval,
          recurringIntervalCount,
          status,
        }) => ({
          cancelAtPeriodEnd,
          currentPeriodEnd,
          endedAt,
          id,
          price: moneyOf(amount, currency),
          productName,
          recurringInterval,
          recurringIntervalCount,
          status,
        }),
      ),
    }
  })

export const currentSubscriptionsQuery = queryOptions({
  queryFn: () => getCurrentSubscriptions(),
  queryKey: SUBSCRIPTION_QUERY_KEYS.CURRENT,
})
