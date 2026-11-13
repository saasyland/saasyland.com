import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

import { timestamps } from "~/src/integrations/drizzle-orm/drizzle.columns"

export const verification = sqliteTable(
  "verification",
  {
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    id: text("id").primaryKey(),
    identifier: text("identifier", { length: 512 }).notNull(),
    value: text("value", { length: 8192 }).notNull(),
    ...timestamps(),
  },
  (table) => [
    index("verification_expiresAt_idx").on(table.expiresAt),
    index("verification_identifier_createdAt_idx").on(table.identifier, table.createdAt),
  ],
)
