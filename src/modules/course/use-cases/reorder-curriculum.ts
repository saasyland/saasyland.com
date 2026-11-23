import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { chapter } from "~/src/modules/chapter/chapter.schema"
import { COURSE_MUTATION_KEYS } from "~/src/modules/course/course.constants"
import type { Course } from "~/src/modules/course/course.types"
import { courseZodSchemas } from "~/src/modules/course/course.zod"
import { lesson } from "~/src/modules/lesson/lesson.schema"

const POSITION_BASE = 1

const placeOf = (...parts: readonly (number | string)[]): string => parts.join(" ")

const sameIds = (stored: readonly { id: string }[], wanted: readonly string[]): boolean =>
  stored.length === wanted.length && new Set(wanted).size === wanted.length && stored.every(({ id }) => wanted.includes(id))

export const reorderCurriculum = createServerFn({ method: "POST" })
  .middleware([authorized({ course: ["update"] })])
  .validator((input: Course["reorderCurriculum"]) => courseZodSchemas.reorderCurriculum.parse(input))
  .handler(async ({ data: { chapters, courseId } }) => {
    const [storedChapters, storedLessons] = await db.batch([
      db.select({ id: chapter.id, position: chapter.position }).from(chapter).where(eq(chapter.courseId, courseId)),
      db
        .select({ chapterId: lesson.chapterId, id: lesson.id, position: lesson.position })
        .from(lesson)
        .where(eq(lesson.courseId, courseId)),
    ])
    const chapterIds = chapters.map(({ chapterId }) => chapterId)
    const lessonIds = chapters.flatMap(({ lessonIds: ids }) => ids)

    if (storedChapters.length === 0) {
      throw new AppError(ERROR_CODES.NOT_FOUND)
    }

    if (!sameIds(storedChapters, chapterIds) || !sameIds(storedLessons, lessonIds)) {
      throw new AppError(ERROR_CODES.CONFLICT)
    }

    const storedChapterPlaces = new Set(storedChapters.map(({ id, position }) => placeOf(id, position)))
    const storedLessonPlaces = new Set(storedLessons.map(({ chapterId, id, position }) => placeOf(id, position, chapterId)))
    const chapterWrites = chapters
      .map(({ chapterId }, index) => ({ chapterId, position: index + POSITION_BASE }))
      .filter(({ chapterId, position }) => !storedChapterPlaces.has(placeOf(chapterId, position)))
      .map(({ chapterId, position }) => db.update(chapter).set({ position }).where(eq(chapter.id, chapterId)))
    const lessonWrites = chapters
      .flatMap(({ chapterId, lessonIds: ids }) => ids.map((lessonId, index) => ({ chapterId, lessonId, position: index + POSITION_BASE })))
      .filter(({ chapterId, lessonId, position }) => !storedLessonPlaces.has(placeOf(lessonId, position, chapterId)))
      .map(({ chapterId, lessonId, position }) => db.update(lesson).set({ chapterId, position }).where(eq(lesson.id, lessonId)))
    const [first, ...rest] = [...chapterWrites, ...lessonWrites]

    if (first !== undefined) {
      await db.batch([first, ...rest])
    }

    return { courseId, moved: chapterWrites.length + lessonWrites.length }
  })

export const reorderCurriculumMutation = mutationOptions({
  mutationFn: (data: Course["reorderCurriculum"]) => reorderCurriculum({ data }),
  mutationKey: COURSE_MUTATION_KEYS.REORDER_CURRICULUM,
})
