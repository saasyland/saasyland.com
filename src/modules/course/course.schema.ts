import { relations, sql } from "drizzle-orm"
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

import { timestamps } from "~/src/integrations/drizzle-orm/drizzle.columns"

import type { LocalizedList, LocalizedText } from "~/src/modules/_core/utils/localized-text"
import { SLUG_MAX_LENGTH } from "~/src/modules/_core/utils/zod-fields"
import { chapter } from "~/src/modules/chapter/chapter.schema"
import {
  COURSE_ICON,
  COURSE_ICONS,
  COURSE_KIND,
  COURSE_KINDS,
  COURSE_LEVEL,
  COURSE_LEVELS,
  COURSE_STATUS,
  COURSE_STATUSES,
} from "~/src/modules/course/course.constants"
import { lesson } from "~/src/modules/lesson/lesson.schema"

export const course = sqliteTable(
  "course",
  {
    icon: text("icon", { enum: COURSE_ICONS }).notNull().default(COURSE_ICON.BOOK_OPEN),
    id: text("id").primaryKey(),
    kind: text("kind", { enum: COURSE_KINDS }).notNull().default(COURSE_KIND.COURSE),
    level: text("level", { enum: COURSE_LEVELS }).notNull().default(COURSE_LEVEL.BEGINNER),
    outcomes: text("outcomes", { mode: "json" })
      .$type<LocalizedList>()
      .notNull()
      .default(sql`'{}'`),
    position: integer("position").notNull().default(0),
    prerequisites: text("prerequisites", { mode: "json" })
      .$type<LocalizedList>()
      .notNull()
      .default(sql`'{}'`),
    slug: text("slug", { length: SLUG_MAX_LENGTH }).notNull().unique(),
    status: text("status", { enum: COURSE_STATUSES }).notNull().default(COURSE_STATUS.DRAFT),
    summary: text("summary", { mode: "json" }).$type<LocalizedText>().notNull(),
    title: text("title", { mode: "json" }).$type<LocalizedText>().notNull(),
    ...timestamps(),
  },
  (table) => [index("course_status_position_idx").on(table.status, table.position)],
)

export const courseRelations = relations(course, ({ many }) => ({
  chapters: many(chapter),
  lessons: many(lesson),
}))
