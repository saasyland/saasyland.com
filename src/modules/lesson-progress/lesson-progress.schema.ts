import { sql } from "drizzle-orm"
import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core"

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
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(unixepoch() * 1000)`)
      .$onUpdate(() => new Date())
      .notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.userId, table.lessonId] })],
)
