import { relations, sql } from "drizzle-orm"
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

import { timestamps } from "~/src/integrations/drizzle-orm/drizzle.columns"

import { LICENSE_KEY_MAX_LENGTH, LICENSE_STATUS, LICENSE_TIERS, POLAR_ID_MAX_LENGTH } from "~/src/modules/license/license.constants"
import { user } from "~/src/modules/user/user.schema"

export const LICENSE_STATUSES = [LICENSE_STATUS.ACTIVE, LICENSE_STATUS.REVOKED] as const

export const license = sqliteTable(
  "license",
  {
    id: text("id").primaryKey(),
    key: text("key", { length: LICENSE_KEY_MAX_LENGTH }).unique(),
    polarCustomerId: text("polar_customer_id", { length: POLAR_ID_MAX_LENGTH }).notNull(),
    polarLicenseKeyId: text("polar_license_key_id", { length: POLAR_ID_MAX_LENGTH }).unique(),
    polarOrderId: text("polar_order_id", { length: POLAR_ID_MAX_LENGTH }),
    purchaseCreatedAt: integer("purchase_created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`0`),
    status: text("status", { enum: LICENSE_STATUSES }).notNull().default(LICENSE_STATUS.ACTIVE),
    tier: text("tier", { enum: LICENSE_TIERS }).notNull(),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: "cascade" }),
    ...timestamps(),
  },
  (table) => [index("license_status_tier_idx").on(table.status, table.tier)],
)

export const revokedLicenseOrder = sqliteTable("revoked_license_order", {
  polarOrderId: text("polar_order_id", { length: POLAR_ID_MAX_LENGTH }).primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
})

export const licenseRelations = relations(license, ({ one }) => ({
  user: one(user, { fields: [license.userId], references: [user.id] }),
}))
