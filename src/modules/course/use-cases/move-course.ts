import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { asc, eq } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { FIRST_POSITION } from "~/src/modules/_core/constants/ordering"
import { reorder } from "~/src/modules/_core/utils/ordering"
import { COURSE_MUTATION_KEYS } from "~/src/modules/course/course.constants"
import { course } from "~/src/modules/course/course.schema"
import type { Course } from "~/src/modules/course/course.types"
import { courseZodSchemas } from "~/src/modules/course/course.zod"

export const moveCourse = createServerFn({ method: "POST" })
  .middleware([authorized({ course: ["update"] })])
  .validator((input: Course["moveCourse"]) => courseZodSchemas.moveCourse.parse(input))
  .handler(async ({ data: { courseId, offset } }) => {
    const courses = await db.select({ id: course.id, position: course.position }).from(course).orderBy(asc(course.position), asc(course.id))
    const moving = courses.find(({ id }) => id === courseId)

    if (moving === undefined) {
      throw new AppError(ERROR_CODES.NOT_FOUND)
    }

    const [first, ...rest] = reorder(courses, courseId, courses.indexOf(moving) + FIRST_POSITION + offset).map((entry) =>
      db.update(course).set({ position: entry.position }).where(eq(course.id, entry.id)),
    )
    if (first !== undefined) {
      await db.batch([first, ...rest])
    }
    return { courseId }
  })

export const moveCourseMutation = mutationOptions({
  mutationFn: (data: Course["moveCourse"]) => moveCourse({ data }),
  mutationKey: COURSE_MUTATION_KEYS.MOVE,
})
