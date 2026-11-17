import { relations } from "drizzle-orm"
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

import { timestamps } from "~/src/integrations/drizzle-orm/drizzle.columns"

import type { LocalizedText } from "~/src/modules/_core/utils/localized-text"
import { LESSON_ATTACHMENT_KINDS, LESSON_ATTACHMENT_URL_MAX_LENGTH } from "~/src/modules/lesson-attachment/lesson-attachment.constants"
import { lesson } from "~/src/modules/lesson/lesson.schema"

export const lessonAttachment = sqliteTable(
  "lesson_attachment",
  {
    contentType: text("content_type"),
    id: text("id").primaryKey(),
    kind: text("kind", { enum: LESSON_ATTACHMENT_KINDS }).notNull(),
    lessonId: text("lesson_id")
      .notNull()
      .references(() => lesson.id, { onDelete: "cascade" }),
    objectKey: text("object_key"),
    position: integer("position").notNull().default(0),
    sizeBytes: integer("size_bytes"),
    title: text("title", { mode: "json" }).$type<LocalizedText>().notNull(),
    url: text("url", { length: LESSON_ATTACHMENT_URL_MAX_LENGTH }),
    ...timestamps(),
  },
  (table) => [index("lesson_attachment_lesson_position_idx").on(table.lessonId, table.position)],
)

export const lessonAttachmentRelations = relations(lessonAttachment, ({ one }) => ({
  lesson: one(lesson, { fields: [lessonAttachment.lessonId], references: [lesson.id] }),
}))
