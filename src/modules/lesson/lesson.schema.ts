import { relations } from "drizzle-orm"
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core"

import { timestamps } from "~/src/integrations/drizzle-orm/drizzle.columns"

import type { LocalizedText } from "~/src/modules/_core/utils/localized-text"
import { SLUG_MAX_LENGTH } from "~/src/modules/_core/utils/zod-fields"
import { chapter } from "~/src/modules/chapter/chapter.schema"
import { course } from "~/src/modules/course/course.schema"
import { LESSON_ACCESS, LESSON_STATUS } from "~/src/modules/lesson/lesson.constants"
import { video } from "~/src/modules/video/video.schema"

export const LESSON_ACCESS_LEVELS = [LESSON_ACCESS.PREVIEW, LESSON_ACCESS.ACCOUNT, LESSON_ACCESS.PAID] as const
export const LESSON_STATUSES = [LESSON_STATUS.DRAFT, LESSON_STATUS.PUBLISHED] as const

export const lesson = sqliteTable(
  "lesson",
  {
    access: text("access", { enum: LESSON_ACCESS_LEVELS }).notNull().default(LESSON_ACCESS.PAID),
    chapterId: text("chapter_id")
      .notNull()
      .references(() => chapter.id, { onDelete: "cascade" }),
    courseId: text("course_id")
      .notNull()
      .references(() => course.id, { onDelete: "cascade" }),
    id: text("id").primaryKey(),
    position: integer("position").notNull().default(0),
    slug: text("slug", { length: SLUG_MAX_LENGTH }).notNull(),
    status: text("status", { enum: LESSON_STATUSES }).notNull().default(LESSON_STATUS.DRAFT),
    summary: text("summary", { mode: "json" }).$type<LocalizedText>().notNull(),
    title: text("title", { mode: "json" }).$type<LocalizedText>().notNull(),
    videoId: text("video_id").references(() => video.id, { onDelete: "set null" }),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("lesson_course_slug_idx").on(table.courseId, table.slug),
    index("lesson_chapter_position_idx").on(table.chapterId, table.position),
  ],
)

export const lessonRelations = relations(lesson, ({ one }) => ({
  chapter: one(chapter, { fields: [lesson.chapterId], references: [chapter.id] }),
  course: one(course, { fields: [lesson.courseId], references: [course.id] }),
  video: one(video, { fields: [lesson.videoId], references: [video.id] }),
}))
