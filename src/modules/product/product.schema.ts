import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

import { timestamps } from "~/src/integrations/drizzle-orm/drizzle.columns"

import { DEFAULT_CURRENCY_CODE } from "~/src/modules/_core/constants/currency"
import { BILLING_CYCLE_MAX_LENGTH, PRODUCT_NAME_MAX_LENGTH, PRODUCT_STATUS, PRODUCT_TYPE } from "~/src/modules/product/product.constants"

export const PRODUCT_STATUSES = [PRODUCT_STATUS.DRAFT, PRODUCT_STATUS.PUBLISHED, PRODUCT_STATUS.ARCHIVED] as const
export const PRODUCT_TYPES = [PRODUCT_TYPE.ONE_TIME, PRODUCT_TYPE.SUBSCRIPTION, PRODUCT_TYPE.COURSE] as const

export const product = sqliteTable(
  "product",
  {
    billingCycle: text("billing_cycle", { length: BILLING_CYCLE_MAX_LENGTH }),
    currency: text("currency", { length: 3 }).notNull().default(DEFAULT_CURRENCY_CODE),
    description: text("description").notNull().default(""),
    id: text("id").primaryKey(),
    name: text("name", { length: PRODUCT_NAME_MAX_LENGTH }).notNull(),
    priceCents: integer("price_cents").notNull().default(0),
    status: text("status", { enum: PRODUCT_STATUSES }).notNull().default(PRODUCT_STATUS.DRAFT),
    type: text("type", { enum: PRODUCT_TYPES }).notNull().default(PRODUCT_TYPE.ONE_TIME),
    ...timestamps(),
  },
  (table) => [index("product_createdAt_idx").on(table.createdAt)],
)
