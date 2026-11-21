import type { AppBadge } from "~/src/data/app-badges"

import { CourseProgressBadge } from "~/src/presentation/components/custom/courses/course-progress-badge"

import { ROUTES } from "~/src/routes"

export const COURSES_APP_BADGES = [{ Badge: CourseProgressBadge, to: ROUTES.COURSES }] as const satisfies readonly AppBadge[]
