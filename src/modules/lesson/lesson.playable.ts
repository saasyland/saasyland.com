import { and, eq } from "drizzle-orm"

import { LESSON_FORMAT } from "~/src/modules/lesson/lesson.constants"
import { lesson } from "~/src/modules/lesson/lesson.schema"
import { video } from "~/src/modules/video/video.schema"

export const playableVideo = and(eq(video.id, lesson.videoId), eq(lesson.format, LESSON_FORMAT.VIDEO))

export const isBeingRecorded = ({ durationMs, format }: { readonly durationMs: number | null; readonly format: string }): boolean =>
  format === LESSON_FORMAT.VIDEO && durationMs === null
