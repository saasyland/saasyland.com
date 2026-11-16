import { API_LIMIT } from "@saasyland/stack/api"
import { relations, sql } from "drizzle-orm"
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

import { timestamps } from "~/src/integrations/drizzle-orm/drizzle.columns"
import { POLAR_ID_MAX_LENGTH } from "~/src/integrations/polar/polar.constants"

import { LICENSE_STATUS, LICENSE_STATUSES, LICENSE_TIERS } from "~/src/modules/license/license.constants"
import { user } from "~/src/modules/user/user.schema"

export const license = sqliteTable(
  "license",
  {
    activatedAt: integer("activated_at", { mode: "timestamp_ms" }),
    deliveredAt: integer("delivered_at", { mode: "timestamp_ms" }),
    id: text("id").primaryKey(),
    key: text("key", { length: API_LIMIT.LICENSE_KEY_MAX_LENGTH }).unique(),
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
    withdrawalConsentAt: integer("withdrawal_consent_at", { mode: "timestamp_ms" }),
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
