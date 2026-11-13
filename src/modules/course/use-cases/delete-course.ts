import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { COURSE_MUTATION_KEYS } from "~/src/modules/course/course.constants"
import { course } from "~/src/modules/course/course.schema"
import type { Course } from "~/src/modules/course/course.types"
import { courseZodSchemas } from "~/src/modules/course/course.zod"

export const deleteCourse = createServerFn({ method: "POST" })
  .middleware([authorized({ course: ["delete"] })])
  .validator((input: Course["deleteCourse"]) => courseZodSchemas.deleteCourse.parse(input))
  .handler(async ({ data }) => {
    const [row] = await db.delete(course).where(eq(course.id, data.courseId)).returning({ id: course.id })

    if (row === undefined) {
      throw new AppError(ERROR_CODES.NOT_FOUND)
    }

    return row
  })

export const deleteCourseMutation = mutationOptions({
  mutationFn: (data: Course["deleteCourse"]) => deleteCourse({ data }),
  mutationKey: COURSE_MUTATION_KEYS.DELETE,
})
