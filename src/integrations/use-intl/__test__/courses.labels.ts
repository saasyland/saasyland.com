import { COURSE_ICON, COURSE_KIND, COURSE_LEVEL, COURSE_STATUS } from "~/src/modules/course/course.constants"
import { LESSON_ACCESS, LESSON_STATUS } from "~/src/modules/lesson/lesson.constants"

export const COURSES_LABELS = [
  { keys: Object.values(COURSE_KIND), labels: "pages.admin.courses.form.kinds" },
  { keys: Object.values(COURSE_STATUS), labels: "pages.admin.courses.form.statuses" },
  { keys: Object.values(COURSE_LEVEL), labels: "pages.admin.courses.form.levels" },
  { keys: Object.values(COURSE_ICON), labels: "pages.admin.courses.form.icons" },
  { keys: Object.values(LESSON_ACCESS), labels: "pages.admin.courses.lesson.accessLevels" },
  { keys: Object.values(LESSON_STATUS), labels: "pages.admin.courses.lesson.statuses" },
  { keys: Object.values(LESSON_ACCESS), labels: "components.custom.lesson-meta.access" },
  { keys: [LESSON_ACCESS.ACCOUNT, LESSON_ACCESS.PAID], labels: "components.custom.lesson-meta.locked" },
  { keys: Object.values(COURSE_KIND), labels: "pages.courses.kinds" },
]
