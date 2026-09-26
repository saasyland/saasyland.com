import { relations, sql } from "drizzle-orm"
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

import { LICENSE_STATUS, LICENSE_TIER } from "~/src/modules/license/license.constants"
import { user } from "~/src/modules/user/user.schema"

export const LICENSE_TIERS = [LICENSE_TIER.CORE, LICENSE_TIER.COMPLETE, LICENSE_TIER.AGENCY] as const
export const LICENSE_STATUSES = [LICENSE_STATUS.ACTIVE, LICENSE_STATUS.REVOKED] as const

export type LicenseTier = (typeof LICENSE_TIERS)[number]

export const POLAR_ID_MAX_LENGTH = 64
export const LICENSE_KEY_MAX_LENGTH = 128

export const license = sqliteTable(
  "license",
  {
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(unixepoch() * 1000)`)
      .notNull(),
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
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(unixepoch() * 1000)`)
      .$onUpdate(
        () =>
          /* @__PURE__ */
          new Date(),
      )
      .notNull(),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: "cascade" }),
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
