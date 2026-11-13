import zod from "zod/v4"

import { MOVE_DIRECTIONS } from "~/src/modules/_core/constants/ordering"
import { localizedTextSchema } from "~/src/modules/_core/utils/localized-text"
import { idField, slugField } from "~/src/modules/_core/utils/zod-fields"
import { LESSON_ACCESS_LEVELS, LESSON_STATUSES } from "~/src/modules/lesson/lesson.schema"

const lessonIdInput = zod.object({
  lessonId: idField,
})

const lessonFields = zod.object({
  access: zod.enum(LESSON_ACCESS_LEVELS),
  slug: slugField,
  status: zod.enum(LESSON_STATUSES),
  summary: localizedTextSchema,
  title: localizedTextSchema,
  videoId: idField.optional(),
})

const createLesson = lessonFields.extend({ chapterId: idField })

const deleteLesson = lessonIdInput

const getLessonPlayback = zod.object({
  courseSlug: slugField,
  lessonSlug: slugField,
})

const moveLesson = lessonIdInput.extend({ direction: zod.enum(MOVE_DIRECTIONS) })

const updateLesson = lessonFields.extend(lessonIdInput.shape)

export const lessonZodSchemas = {
  createLesson,
  deleteLesson,
  getLessonPlayback,
  moveLesson,
  updateLesson,
}
