import { sql } from "drizzle-orm"
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

export const VIDEO_TITLE_MAX_LENGTH = 255

export const video = sqliteTable(
  "video",
  {
    captionLocales: text("caption_locales", { mode: "json" })
      .$type<SupportedLocale[]>()
      .notNull()
      .default(sql`'[]'`),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(unixepoch() * 1000)`)
      .notNull(),
    durationMs: integer("duration_ms").notNull(),
    height: integer("height").notNull(),
    id: text("id").primaryKey(),
    sizeBytes: integer("size_bytes").notNull(),
    title: text("title", { length: VIDEO_TITLE_MAX_LENGTH }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(unixepoch() * 1000)`)
      .$onUpdate(() => new Date())
      .notNull(),
    width: integer("width").notNull(),
  },
  (table) => [index("video_created_at_idx").on(table.createdAt)],
)
