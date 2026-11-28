import { DASHBOARD_COLUMN_SIZES } from "~/src/data/admin"

export const COURSE_COLUMN_SIZES = {
  course: 296,
  kind: 136,
  lessons: 136,
  position: 64,
  status: 136,
  updatedAt: 184,
} as const

export const COURSE_PROGRESS_COLUMN_SIZES = {
  completedLessons: 248,
  finished: DASHBOARD_COLUMN_SIZES.count,
  learners: DASHBOARD_COLUMN_SIZES.count,
  lessons: DASHBOARD_COLUMN_SIZES.count,
} as const
