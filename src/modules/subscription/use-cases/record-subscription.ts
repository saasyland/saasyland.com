import "@tanstack/react-start/server-only"

import type { models } from "@polar-sh/sdk/2026-10"
import { lte } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { polarCustomerAccount } from "~/src/integrations/polar/polar.customers"

import { subscription } from "~/src/modules/subscription/subscription.schema"

const timeOf = (time: string | null): Date | null => (time === null ? time : new Date(time))

export const recordSubscription = async (polarSubscription: models.Subscription): Promise<void> => {
  const copy = {
    amount: polarSubscription.amount,
    cancelAtPeriodEnd: polarSubscription.cancel_at_period_end,
    changedAt: new Date(polarSubscription.modified_at ?? polarSubscription.created_at),
    currency: polarSubscription.currency,
    currentPeriodEnd: new Date(polarSubscription.current_period_end),
    customerId: polarSubscription.customer_id,
    endedAt: timeOf(polarSubscription.ended_at),
    productId: polarSubscription.product_id,
    productName: polarSubscription.product.name,
    recurringInterval: polarSubscription.recurring_interval,
    recurringIntervalCount: polarSubscription.recurring_interval_count,
    startedAt: timeOf(polarSubscription.started_at),
    status: polarSubscription.status,
    userId: polarCustomerAccount(polarSubscription.customer),
  }

  await db
    .insert(subscription)
    .values({ id: polarSubscription.id, ...copy })
    .onConflictDoUpdate({ set: copy, setWhere: lte(subscription.changedAt, copy.changedAt), target: subscription.id })
}
