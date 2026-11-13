import { relations } from "drizzle-orm"
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core"

import { timestamps } from "~/src/integrations/drizzle-orm/drizzle.columns"

import { user } from "~/src/modules/user/user.schema"

const DEFAULT_FAILED_VERIFICATION_COUNT = 0

export const twoFactor = sqliteTable(
  "two_factor",
  {
    backupCodes: text("backup_codes", { length: 8192 }).notNull(),
    failedVerificationCount: integer("failed_verification_count").default(DEFAULT_FAILED_VERIFICATION_COUNT).notNull(),
    id: text("id").primaryKey(),
    lockedUntil: integer("locked_until", { mode: "timestamp_ms" }),
    secret: text("secret", { length: 1024 }).notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    verified: integer("verified", { mode: "boolean" }).default(true).notNull(),
    ...timestamps(),
  },
  (table) => [uniqueIndex("twoFactor_userId_uidx").on(table.userId)],
)

export const twoFactorRelations = relations(twoFactor, ({ one }) => ({
  user: one(user, {
    fields: [twoFactor.userId],
    references: [user.id],
  }),
}))
