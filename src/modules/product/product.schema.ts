import { sql } from "drizzle-orm"
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

import { DEFAULT_CURRENCY_CODE } from "~/src/modules/_core/constants/currency"

export const PRODUCT_STATUSES = ["draft", "published", "archived"] as const
export const PRODUCT_TYPES = ["one_time", "subscription", "course"] as const

export type ProductStatus = (typeof PRODUCT_STATUSES)[number]
export type ProductType = (typeof PRODUCT_TYPES)[number]

export const product = sqliteTable(
  "product",
  {
    billingCycle: text("billing_cycle", { length: 32 }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(unixepoch() * 1000)`)
      .notNull(),
    currency: text("currency", { length: 3 }).notNull().default(DEFAULT_CURRENCY_CODE),
    description: text("description").notNull().default(""),
    id: text("id").primaryKey(),
    name: text("name", { length: 255 }).notNull(),
    priceCents: integer("price_cents").notNull().default(0),
    status: text("status", { enum: PRODUCT_STATUSES }).notNull().default("draft"),
    type: text("type", { enum: PRODUCT_TYPES }).notNull().default("one_time"),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(unixepoch() * 1000)`)
      .$onUpdate(
        () =>
          /* @__PURE__ */
          new Date(),
      )
      .notNull(),
  },
  (table) => [index("product_createdAt_idx").on(table.createdAt)],
)
