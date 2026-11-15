import { COURSE_KIND } from "~/src/modules/course/course.constants"
import { LESSON_ACCESS } from "~/src/modules/lesson/lesson.constants"

export const LANDING_LABELS = [
  { keys: Object.values(LESSON_ACCESS), labels: "pages.landing.studio.masterclass.access" },
  { keys: Object.values(COURSE_KIND), labels: "pages.landing.studio.masterclass.kinds" },
]
