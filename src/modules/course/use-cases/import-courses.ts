import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { RATE_LIMIT_WINDOW_SECONDS, authorized, withRateLimit } from "~/src/integrations/better-auth/auth.middleware"

import { COURSE_IMPORTS_PER_MINUTE, COURSE_MUTATION_KEYS } from "~/src/modules/course/course.constants"
import { applyCourseImport, importSummary, planCourseImport, readCourseDocument } from "~/src/modules/course/course.transfer"
import type { Course } from "~/src/modules/course/course.types"
import { courseZodSchemas } from "~/src/modules/course/course.zod"

const IMPORT_RATE_LIMIT = { max: COURSE_IMPORTS_PER_MINUTE, window: RATE_LIMIT_WINDOW_SECONDS } as const

export const importCourses = createServerFn({ method: "POST" })
  .middleware([withRateLimit("import-courses", IMPORT_RATE_LIMIT), authorized({ course: ["create", "update", "delete"] })])
  .validator((input: Course["importCourses"]) => courseZodSchemas.importCourses.parse(input))
  .handler(async ({ data: { document, dryRun, removeMissing } }) => {
    const read = readCourseDocument(document)
    if (!("document" in read)) {
      return read
    }

    const plan = await planCourseImport({ document: read.document, removeMissing })
    if (!dryRun) {
      await applyCourseImport(plan)
    }

    return importSummary(plan)
  })

export const importCoursesMutation = mutationOptions({
  mutationFn: (data: Course["importCourses"]) => importCourses({ data }),
  mutationKey: COURSE_MUTATION_KEYS.IMPORT,
})
