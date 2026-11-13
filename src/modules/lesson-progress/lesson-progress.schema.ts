import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core"

import { timestamps } from "~/src/integrations/drizzle-orm/drizzle.columns"

import { lesson } from "~/src/modules/lesson/lesson.schema"
import { user } from "~/src/modules/user/user.schema"

export const lessonProgress = sqliteTable(
  "lesson_progress",
  {
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
    lessonId: text("lesson_id")
      .notNull()
      .references(() => lesson.id, { onDelete: "cascade" }),
    positionMs: integer("position_ms").notNull().default(0),
    updatedAt: timestamps().updatedAt,
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.userId, table.lessonId] })],
)
