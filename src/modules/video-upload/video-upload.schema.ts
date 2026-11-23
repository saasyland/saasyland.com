import { relations, sql } from "drizzle-orm"
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

import { timestamps } from "~/src/integrations/drizzle-orm/drizzle.columns"

import { LESSON_ATTACHMENT_FILE_NAME_MAX_LENGTH } from "~/src/modules/lesson-attachment/lesson-attachment.constants"
import { lesson } from "~/src/modules/lesson/lesson.schema"
import { VIDEO_UPLOAD_FAILURES, VIDEO_UPLOAD_STATUS, VIDEO_UPLOAD_STATUSES } from "~/src/modules/video-upload/video-upload.constants"

export const videoUpload = sqliteTable(
  "video_upload",
  {
    contentType: text("content_type").notNull(),
    failure: text("failure", { enum: VIDEO_UPLOAD_FAILURES }),
    fileName: text("file_name", { length: LESSON_ATTACHMENT_FILE_NAME_MAX_LENGTH }).notNull(),
    id: text("id").primaryKey(),
    lastModified: integer("last_modified").notNull(),
    lessonId: text("lesson_id")
      .notNull()
      .unique()
      .references(() => lesson.id, { onDelete: "cascade" }),
    multipartId: text("multipart_id").notNull(),
    objectKey: text("object_key").notNull(),
    partBytes: integer("part_bytes").notNull(),
    parts: text("parts", { mode: "json" })
      .$type<Record<string, string>>()
      .notNull()
      .default(sql`'{}'`),
    sizeBytes: integer("size_bytes").notNull(),
    status: text("status", { enum: VIDEO_UPLOAD_STATUSES }).notNull().default(VIDEO_UPLOAD_STATUS.UPLOADING),
    ...timestamps(),
  },
  (table) => [index("video_upload_status_idx").on(table.status, table.createdAt)],
)

export const videoUploadRelations = relations(videoUpload, ({ one }) => ({
  lesson: one(lesson, { fields: [videoUpload.lessonId], references: [lesson.id] }),
}))
