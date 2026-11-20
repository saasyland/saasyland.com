import "@tanstack/react-start/server-only"

import { env } from "cloudflare:workers"

import { type SQL, eq } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { lessonAttachment } from "~/src/modules/lesson-attachment/lesson-attachment.schema"
import { lesson } from "~/src/modules/lesson/lesson.schema"

export const attachmentObjectKeys = async (lessons: SQL): Promise<string[]> => {
  const rows = await db
    .select({ objectKey: lessonAttachment.objectKey })
    .from(lessonAttachment)
    .innerJoin(lesson, eq(lesson.id, lessonAttachment.lessonId))
    .where(lessons)

  return rows.flatMap(({ objectKey }) => objectKey ?? [])
}

export const removeAttachmentObjects = async (keys: readonly string[]): Promise<void> => {
  if (keys.length > 0) {
    await env.MEDIA.delete([...keys])
  }
}
