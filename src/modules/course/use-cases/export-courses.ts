import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import { COURSE_MUTATION_KEYS } from "~/src/modules/course/course.constants"
import { exportCourseDocument } from "~/src/modules/course/course.transfer"
import type { Course } from "~/src/modules/course/course.types"
import { courseZodSchemas } from "~/src/modules/course/course.zod"

export const exportCourses = createServerFn({ method: "GET" })
  .middleware([authorized({ course: ["read"] })])
  .validator((input: Course["exportCourses"]) => courseZodSchemas.exportCourses.parse(input))
  .handler(({ data }) => exportCourseDocument(data.courseId))

export const exportCoursesMutation = mutationOptions({
  mutationFn: (data: Course["exportCourses"]) => exportCourses({ data }),
  mutationKey: COURSE_MUTATION_KEYS.EXPORT,
})
