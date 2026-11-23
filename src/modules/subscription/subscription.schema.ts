import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

import { timestamps } from "~/src/integrations/drizzle-orm/drizzle.columns"
import { POLAR_ID_MAX_LENGTH } from "~/src/integrations/polar/polar.constants"

import { SUBSCRIPTION_RECURRING_INTERVALS, SUBSCRIPTION_STATUSES } from "~/src/modules/subscription/subscription.constants"
import { user } from "~/src/modules/user/user.schema"

import { CURRENCY_CODE_LENGTH } from "~/src/data/currencies"

export const subscription = sqliteTable(
  "subscription",
  {
    amount: integer("amount").notNull(),
    cancelAtPeriodEnd: integer("cancel_at_period_end", { mode: "boolean" }).notNull(),
    changedAt: integer("changed_at", { mode: "timestamp_ms" }).notNull(),
    currency: text("currency", { length: CURRENCY_CODE_LENGTH }).notNull(),
    currentPeriodEnd: integer("current_period_end", { mode: "timestamp_ms" }).notNull(),
    customerId: text("customer_id", { length: POLAR_ID_MAX_LENGTH }).notNull(),
    endedAt: integer("ended_at", { mode: "timestamp_ms" }),
    id: text("id", { length: POLAR_ID_MAX_LENGTH }).primaryKey(),
    productId: text("product_id", { length: POLAR_ID_MAX_LENGTH }).notNull(),
    productName: text("product_name").notNull(),
    recurringInterval: text("recurring_interval", { enum: SUBSCRIPTION_RECURRING_INTERVALS }).notNull(),
    recurringIntervalCount: integer("recurring_interval_count").notNull(),
    startedAt: integer("started_at", { mode: "timestamp_ms" }),
    status: text("status", { enum: SUBSCRIPTION_STATUSES }).notNull(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    ...timestamps(),
  },
  (table) => [
    index("subscription_user_status_idx").on(table.userId, table.status),
    index("subscription_status_current_period_end_idx").on(table.status, table.currentPeriodEnd),
  ],
)
