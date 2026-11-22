import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { eq, sql } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { COURSE_MUTATION_KEYS } from "~/src/modules/course/course.constants"
import { removeCoverObjects } from "~/src/modules/course/course.objects"
import { course } from "~/src/modules/course/course.schema"
import type { Course } from "~/src/modules/course/course.types"
import { courseZodSchemas } from "~/src/modules/course/course.zod"

export const removeCourseCover = createServerFn({ method: "POST" })
  .middleware([authorized({ course: ["update"] })])
  .validator((input: Course["removeCourseCover"]) => courseZodSchemas.removeCourseCover.parse(input))
  .handler(async ({ data: { courseId } }) => {
    const [row] = await db.select({ cover: course.cover }).from(course).where(eq(course.id, courseId)).limit(1)

    if (row === undefined) {
      throw new AppError(ERROR_CODES.NOT_FOUND)
    }

    await db
      .update(course)
      .set({ cover: sql`null` })
      .where(eq(course.id, courseId))
    await removeCoverObjects(row.cover)

    return { id: courseId }
  })

export const removeCourseCoverMutation = mutationOptions({
  mutationFn: (data: Course["removeCourseCover"]) => removeCourseCover({ data }),
  mutationKey: COURSE_MUTATION_KEYS.REMOVE_COVER,
})
