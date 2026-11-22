import type * as zod from "zod"

import type { course } from "~/src/modules/course/course.schema"
import type { courseZodSchemas } from "~/src/modules/course/course.zod"
import type { getCatalogue } from "~/src/modules/course/use-cases/get-catalogue"
import type { getCourse } from "~/src/modules/course/use-cases/get-course"
import type { getCourseEditor } from "~/src/modules/course/use-cases/get-course-editor"
import type { getCourseShowcase } from "~/src/modules/course/use-cases/get-course-showcase"
import type { getCourses } from "~/src/modules/course/use-cases/get-courses"
import type { importCourses } from "~/src/modules/course/use-cases/import-courses"

type CoursePage = Awaited<ReturnType<typeof getCourse>>

type CourseEditor = Awaited<ReturnType<typeof getCourseEditor>>

export interface Course {
  select: typeof course.$inferSelect
  insert: typeof course.$inferInsert
  catalogue: Awaited<ReturnType<typeof getCatalogue>>
  catalogueCourse: Awaited<ReturnType<typeof getCatalogue>>["courses"][number]
  page: CoursePage
  pageLesson: CoursePage["chapters"][number]["lessons"][number]
  showcase: Awaited<ReturnType<typeof getCourseShowcase>>
  editor: CourseEditor
  editorChapter: CourseEditor["chapters"][number]
  editorLesson: CourseEditor["chapters"][number]["lessons"][number]
  editorAttachment: CourseEditor["chapters"][number]["lessons"][number]["attachments"][number]
  listRow: Awaited<ReturnType<typeof getCourses>>["rows"][number]
  importResult: Awaited<ReturnType<typeof importCourses>>
  document: zod.output<typeof courseZodSchemas.courseDocument>
  courseCoverSource: zod.input<typeof courseZodSchemas.courseCoverSource>
  courseDocument: zod.input<typeof courseZodSchemas.courseDocument>
  createCourse: zod.input<typeof courseZodSchemas.createCourse>
  deleteCourse: zod.input<typeof courseZodSchemas.deleteCourse>
  exportCourses: zod.input<typeof courseZodSchemas.exportCourses>
  getCatalogue: zod.input<typeof courseZodSchemas.getCatalogue>
  getCourse: zod.input<typeof courseZodSchemas.getCourse>
  getCourseEditor: zod.input<typeof courseZodSchemas.getCourseEditor>
  getCourseShowcase: zod.input<typeof courseZodSchemas.getCourseShowcase>
  getCourses: zod.input<typeof courseZodSchemas.getCourses>
  importCourses: zod.input<typeof courseZodSchemas.importCourses>
  moveCourse: zod.input<typeof courseZodSchemas.moveCourse>
  removeCourseCover: zod.input<typeof courseZodSchemas.removeCourseCover>
  updateCourse: zod.input<typeof courseZodSchemas.updateCourse>
  uploadCourseCover: zod.input<typeof courseZodSchemas.uploadCourseCover>
}
