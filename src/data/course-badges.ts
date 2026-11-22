import { COURSE_STATUS } from "~/src/modules/course/course.constants"
import type { Course } from "~/src/modules/course/course.types"
import { LESSON_ACCESS, LESSON_STATUS } from "~/src/modules/lesson/lesson.constants"
import type { Lesson } from "~/src/modules/lesson/lesson.types"

import type { BadgeVariant } from "~/src/presentation/components/shadcn/badge"

export const LESSON_ACCESS_BADGES: Record<Lesson["select"]["access"], BadgeVariant> = {
  [LESSON_ACCESS.ACCOUNT]: "neutral",
  [LESSON_ACCESS.PAID]: "neutral",
  [LESSON_ACCESS.PREVIEW]: "accent",
}

export const COURSE_STATUS_BADGES: Record<Course["select"]["status"], BadgeVariant> = {
  [COURSE_STATUS.DRAFT]: "neutral",
  [COURSE_STATUS.PUBLISHED]: "accent",
}

export const LESSON_STATUS_BADGES: Record<Lesson["select"]["status"], BadgeVariant> = {
  [LESSON_STATUS.DRAFT]: "neutral",
  [LESSON_STATUS.PUBLISHED]: "accent",
}
