import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { COURSE_MUTATION_KEYS } from "~/src/modules/course/course.constants"
import { removeCoverObjects } from "~/src/modules/course/course.objects"
import { course } from "~/src/modules/course/course.schema"
import type { Course } from "~/src/modules/course/course.types"
import { courseZodSchemas } from "~/src/modules/course/course.zod"
import { attachmentObjectKeys, removeAttachmentObjects } from "~/src/modules/lesson-attachment/lesson-attachment.objects"
import { lesson } from "~/src/modules/lesson/lesson.schema"
import { removeUploadObjects, uploadObjects } from "~/src/modules/video-upload/video-upload.objects"

export const deleteCourse = createServerFn({ method: "POST" })
  .middleware([authorized({ course: ["delete"] })])
  .validator((input: Course["deleteCourse"]) => courseZodSchemas.deleteCourse.parse(input))
  .handler(async ({ data }) => {
    const lessons = eq(lesson.courseId, data.courseId)
    const [objectKeys, uploads] = await Promise.all([attachmentObjectKeys(lessons), uploadObjects(lessons)])
    const [row] = await db.delete(course).where(eq(course.id, data.courseId)).returning({ cover: course.cover, id: course.id })

    if (row === undefined) {
      throw new AppError(ERROR_CODES.NOT_FOUND)
    }

    await Promise.all([removeAttachmentObjects(objectKeys), removeUploadObjects(uploads), removeCoverObjects(row.cover)])

    return { id: row.id }
  })

export const deleteCourseMutation = mutationOptions({
  mutationFn: (data: Course["deleteCourse"]) => deleteCourse({ data }),
  mutationKey: COURSE_MUTATION_KEYS.DELETE,
})
