import type { AdminSkeleton } from "~/src/data/skeletons"

import {
  AdminCourseCreatePending,
  AdminCoursesPending,
  AdminVideosPending,
} from "~/src/presentation/components/custom/admin/courses-pending"

import { ROUTES } from "~/src/routes"

export const COURSES_SKELETONS = [
  { pendingComponent: AdminCoursesPending, to: ROUTES.ADMIN_COURSES },
  { pendingComponent: AdminCourseCreatePending, to: ROUTES.ADMIN_COURSES_CREATE },
  { pendingComponent: AdminVideosPending, to: ROUTES.ADMIN_VIDEOS },
] as const satisfies readonly AdminSkeleton[]
