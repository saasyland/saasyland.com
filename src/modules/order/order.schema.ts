import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

import { timestamps } from "~/src/integrations/drizzle-orm/drizzle.columns"
import { POLAR_ID_MAX_LENGTH } from "~/src/integrations/polar/polar.constants"

import { COUNTRY_CODE_LENGTH } from "~/src/modules/_core/constants/country"
import { CURRENCY_CODE_LENGTH } from "~/src/modules/_core/constants/currency"
import { ORDER_STATUSES } from "~/src/modules/order/order.constants"
import { user } from "~/src/modules/user/user.schema"

export const order = sqliteTable(
  "order",
  {
    billingCountry: text("billing_country", { length: COUNTRY_CODE_LENGTH }),
    changedAt: integer("changed_at", { mode: "timestamp_ms" }).notNull(),
    currency: text("currency", { length: CURRENCY_CODE_LENGTH }).notNull(),
    customerId: text("customer_id", { length: POLAR_ID_MAX_LENGTH }).notNull(),
    description: text("description").notNull(),
    discountAmount: integer("discount_amount"),
    discountCode: text("discount_code"),
    discountId: text("discount_id", { length: POLAR_ID_MAX_LENGTH }),
    discountName: text("discount_name"),
    id: text("id", { length: POLAR_ID_MAX_LENGTH }).primaryKey(),
    invoiceNumber: text("invoice_number"),
    placedAt: integer("placed_at", { mode: "timestamp_ms" }).notNull(),
    productId: text("product_id", { length: POLAR_ID_MAX_LENGTH }),
    refundedAmount: integer("refunded_amount").notNull(),
    status: text("status", { enum: ORDER_STATUSES }).notNull(),
    subscriptionId: text("subscription_id", { length: POLAR_ID_MAX_LENGTH }),
    totalAmount: integer("total_amount").notNull(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    ...timestamps(),
  },
  (table) => [
    index("order_user_placed_at_idx").on(table.userId, table.placedAt),
    index("order_status_placed_at_idx").on(table.status, table.placedAt),
  ],
)
