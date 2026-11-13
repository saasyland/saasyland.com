import { relations, sql } from "drizzle-orm"
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

import type { LocalizedText } from "~/src/modules/_core/utils/localized-text"
import { course } from "~/src/modules/course/course.schema"
import { lesson } from "~/src/modules/lesson/lesson.schema"

export const chapter = sqliteTable(
  "chapter",
  {
    courseId: text("course_id")
      .notNull()
      .references(() => course.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(unixepoch() * 1000)`)
      .notNull(),
    id: text("id").primaryKey(),
    position: integer("position").notNull().default(0),
    title: text("title", { mode: "json" }).$type<LocalizedText>().notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(unixepoch() * 1000)`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("chapter_course_position_idx").on(table.courseId, table.position)],
)

export const chapterRelations = relations(chapter, ({ many, one }) => ({
  course: one(course, { fields: [chapter.courseId], references: [course.id] }),
  lessons: many(lesson),
}))
