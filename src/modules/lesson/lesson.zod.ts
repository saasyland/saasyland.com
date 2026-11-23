import * as zod from "zod"

import { MOVE_DIRECTIONS } from "~/src/modules/_core/constants/ordering"
import { localizedTextSchema } from "~/src/modules/_core/utils/localized-text"
import { localizedSearchSchema } from "~/src/modules/_core/utils/search"
import { idField, localeField, slugField } from "~/src/modules/_core/utils/zod-fields"
import {
  LESSON_ACCESS_LEVELS,
  LESSON_DESCRIPTION_MAX_LENGTH,
  LESSON_KEY_MOMENTS_MAX_ITEMS,
  LESSON_KEY_MOMENT_MAX_SECONDS,
  LESSON_STATUSES,
} from "~/src/modules/lesson/lesson.constants"

import { parseClock } from "~/src/lib/duration"

const lessonIdInput = zod.object({
  lessonId: idField,
})

const momentTime = zod.string().transform((clock, context) => {
  const seconds = parseClock(clock)
  if (seconds === undefined || seconds > LESSON_KEY_MOMENT_MAX_SECONDS) {
    context.addIssue({ code: "custom", input: clock, message: "timeInvalid" })
    return zod.NEVER
  }

  return seconds
})

const keyMoment = zod.object({ at: momentTime, label: localizedTextSchema }).transform(({ at, label }) => ({ label, seconds: at }))

const lessonFields = zod.object({
  access: zod.enum(LESSON_ACCESS_LEVELS),
  slug: slugField,
  status: zod.enum(LESSON_STATUSES),
  summary: localizedTextSchema,
  title: localizedTextSchema,
})

const lessonContent = zod.object({
  description: zod.partialRecord(localeField, zod.string().trim().max(LESSON_DESCRIPTION_MAX_LENGTH, { message: "descriptionTooLong" })),
  keyMoments: zod
    .array(keyMoment)
    .max(LESSON_KEY_MOMENTS_MAX_ITEMS, { message: "tooManyKeyMoments" })
    .transform((moments) => moments.toSorted((first, second) => first.seconds - second.seconds)),
})

const createLesson = lessonFields.extend({ chapterId: idField, videoId: idField.optional() })

const deleteLesson = lessonIdInput

const getLesson = zod.object({
  courseSlug: slugField,
  lessonSlug: slugField,
  locale: localeField,
})

const getLessonTitle = lessonIdInput

const getLessonPlayback = zod.object({
  courseSlug: slugField,
  lessonSlug: slugField,
})

const moveLesson = lessonIdInput.extend({ direction: zod.enum(MOVE_DIRECTIONS) })

const replaceLessonVideo = lessonIdInput.extend({ videoId: idField })

const updateLesson = lessonFields.extend(lessonContent.shape).extend(lessonIdInput.shape)

const searchLessons = localizedSearchSchema

export const lessonZodSchemas = {
  createLesson,
  deleteLesson,
  getLesson,
  getLessonPlayback,
  getLessonTitle,
  moveLesson,
  replaceLessonVideo,
  searchLessons,
  updateLesson,
}
