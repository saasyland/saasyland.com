import type { PageSkeleton } from "~/src/data/skeletons"

import { AdminCourseCreatePending, AdminCoursesPending } from "~/src/presentation/components/custom/admin/courses-pending"

import { ROUTES } from "~/src/routes"

export const COURSES_SKELETONS = [
  { pendingComponent: AdminCoursesPending, to: ROUTES.ADMIN_COURSES },
  { pendingComponent: AdminCourseCreatePending, to: ROUTES.ADMIN_COURSES_CREATE },
] as const satisfies readonly PageSkeleton[]
