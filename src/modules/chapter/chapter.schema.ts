import { relations } from "drizzle-orm"
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

import { timestamps } from "~/src/integrations/drizzle-orm/drizzle.columns"

import type { LocalizedText } from "~/src/modules/_core/utils/localized-text"
import { course } from "~/src/modules/course/course.schema"
import { lesson } from "~/src/modules/lesson/lesson.schema"

export const chapter = sqliteTable(
  "chapter",
  {
    courseId: text("course_id")
      .notNull()
      .references(() => course.id, { onDelete: "cascade" }),
    id: text("id").primaryKey(),
    position: integer("position").notNull().default(0),
    title: text("title", { mode: "json" }).$type<LocalizedText>().notNull(),
    ...timestamps(),
  },
  (table) => [index("chapter_course_position_idx").on(table.courseId, table.position)],
)

export const chapterRelations = relations(chapter, ({ many, one }) => ({
  course: one(course, { fields: [chapter.courseId], references: [course.id] }),
  lessons: many(lesson),
}))
