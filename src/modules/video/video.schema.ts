import { sql } from "drizzle-orm"
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

import { timestamps } from "~/src/integrations/drizzle-orm/drizzle.columns"
import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

export const VIDEO_TITLE_MAX_LENGTH = 255

export const video = sqliteTable(
  "video",
  {
    captionLocales: text("caption_locales", { mode: "json" })
      .$type<SupportedLocale[]>()
      .notNull()
      .default(sql`'[]'`),
    durationMs: integer("duration_ms").notNull(),
    height: integer("height").notNull(),
    id: text("id").primaryKey(),
    sizeBytes: integer("size_bytes").notNull(),
    title: text("title", { length: VIDEO_TITLE_MAX_LENGTH }).notNull(),
    width: integer("width").notNull(),
    ...timestamps(),
  },
  (table) => [index("video_created_at_idx").on(table.createdAt)],
)
