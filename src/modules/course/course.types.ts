import type * as zod from "zod"

import type { course } from "~/src/modules/course/course.schema"
import type { courseZodSchemas } from "~/src/modules/course/course.zod"
import type { getCatalogue } from "~/src/modules/course/use-cases/get-catalogue"
import type { getCourse } from "~/src/modules/course/use-cases/get-course"
import type { getCourseEditor } from "~/src/modules/course/use-cases/get-course-editor"
import type { getCourses } from "~/src/modules/course/use-cases/get-courses"

type CoursePage = Awaited<ReturnType<typeof getCourse>>

export interface Course {
  select: typeof course.$inferSelect
  insert: typeof course.$inferInsert
  catalogue: Awaited<ReturnType<typeof getCatalogue>>
  page: CoursePage
  pageLesson: CoursePage["chapters"][number]["lessons"][number]
  editor: Awaited<ReturnType<typeof getCourseEditor>>
  listRow: Awaited<ReturnType<typeof getCourses>>["rows"][number]
  createCourse: zod.input<typeof courseZodSchemas.createCourse>
  deleteCourse: zod.input<typeof courseZodSchemas.deleteCourse>
  getCatalogue: zod.input<typeof courseZodSchemas.getCatalogue>
  getCourse: zod.input<typeof courseZodSchemas.getCourse>
  getCourseEditor: zod.input<typeof courseZodSchemas.getCourseEditor>
  getCourses: zod.input<typeof courseZodSchemas.getCourses>
  moveCourse: zod.input<typeof courseZodSchemas.moveCourse>
  updateCourse: zod.input<typeof courseZodSchemas.updateCourse>
}
