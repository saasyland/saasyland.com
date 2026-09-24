import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

export const rateLimit = sqliteTable(
  "rate_limit",
  {
    attempts: integer("attempts").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    key: text("key").primaryKey(),
  },
  (table) => [index("rate_limit_expires_at_idx").on(table.expiresAt)],
)
