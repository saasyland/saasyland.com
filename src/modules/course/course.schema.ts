import { relations } from "drizzle-orm"
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

import { timestamps } from "~/src/integrations/drizzle-orm/drizzle.columns"

import type { LocalizedText } from "~/src/modules/_core/utils/localized-text"
import { SLUG_MAX_LENGTH } from "~/src/modules/_core/utils/zod-fields"
import { chapter } from "~/src/modules/chapter/chapter.schema"
import { COURSE_KIND, COURSE_STATUS } from "~/src/modules/course/course.constants"
import { lesson } from "~/src/modules/lesson/lesson.schema"

export const COURSE_KINDS = [COURSE_KIND.COURSE, COURSE_KIND.TUTORIAL, COURSE_KIND.PROJECT] as const
export const COURSE_STATUSES = [COURSE_STATUS.DRAFT, COURSE_STATUS.PUBLISHED] as const

export const course = sqliteTable(
  "course",
  {
    id: text("id").primaryKey(),
    kind: text("kind", { enum: COURSE_KINDS }).notNull().default(COURSE_KIND.COURSE),
    position: integer("position").notNull().default(0),
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
