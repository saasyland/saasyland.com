import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { rethrowAsConflict } from "~/src/integrations/drizzle-orm/drizzle.errors"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { COURSE_MUTATION_KEYS } from "~/src/modules/course/course.constants"
import { course } from "~/src/modules/course/course.schema"
import type { Course } from "~/src/modules/course/course.types"
import { courseZodSchemas } from "~/src/modules/course/course.zod"

export const updateCourse = createServerFn({ method: "POST" })
  .middleware([authorized({ course: ["update"] })])
  .validator((input: Course["updateCourse"]) => courseZodSchemas.updateCourse.parse(input))
  .handler(async ({ data }) => {
    const { courseId, ...fields } = data
    const [row] = await db.update(course).set(fields).where(eq(course.id, courseId)).returning({ id: course.id }).catch(rethrowAsConflict)

    if (row === undefined) {
      throw new AppError(ERROR_CODES.NOT_FOUND)
    }

    return row
  })

export const updateCourseMutation = mutationOptions({
  mutationFn: (data: Course["updateCourse"]) => updateCourse({ data }),
  mutationKey: COURSE_MUTATION_KEYS.UPDATE,
})
