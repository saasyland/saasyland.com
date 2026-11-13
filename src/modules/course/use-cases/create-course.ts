import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { v7 } from "uuid"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { rethrowAsConflict } from "~/src/integrations/drizzle-orm/drizzle.errors"

import { nextPosition } from "~/src/modules/_core/utils/ordering"
import { COURSE_MUTATION_KEYS } from "~/src/modules/course/course.constants"
import { course } from "~/src/modules/course/course.schema"
import type { Course } from "~/src/modules/course/course.types"
import { courseZodSchemas } from "~/src/modules/course/course.zod"

export const createCourse = createServerFn({ method: "POST" })
  .middleware([authorized({ course: ["create"] })])
  .validator((input: Course["createCourse"]) => courseZodSchemas.createCourse.parse(input))
  .handler(async ({ data }) => {
    const positions = await db.select({ position: course.position }).from(course)

    return db
      .insert(course)
      .values({ ...data, id: v7(), position: nextPosition(positions) })
      .returning({ id: course.id })
      .get()
      .catch(rethrowAsConflict)
  })

export const createCourseMutation = mutationOptions({
  mutationFn: (data: Course["createCourse"]) => createCourse({ data }),
  mutationKey: COURSE_MUTATION_KEYS.CREATE,
})
