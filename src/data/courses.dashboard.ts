import { useSuspenseQuery } from "@tanstack/react-query"
import { lazyRouteComponent } from "@tanstack/react-router"
import { Clapperboard, GraduationCap } from "lucide-react"

import { courseProgressQuery } from "~/src/modules/lesson-progress/use-cases/get-course-progress"
import { getVideosQuery } from "~/src/modules/video/use-cases/get-videos"

import { type AdminDashboardEntry, DASHBOARD_PLACEMENT } from "~/src/data/dashboard.constants"

import { CourseProgressPending } from "~/src/presentation/components/custom/admin/courses/course-progress-pending"

import * as ROUTES from "~/src/routes"

const AREA = "courses"

export const COURSES_DASHBOARD = [
  {
    area: AREA,
    icon: GraduationCap,
    key: "learners",
    order: 40,
    placement: DASHBOARD_PLACEMENT.STAT,
    prefetch: (queryClient) => queryClient.query({ ...courseProgressQuery, staleTime: "static" }),
    to: ROUTES.ADMIN_COURSES,
    useValue: () => useSuspenseQuery(courseProgressQuery).data.learners,
  },
  {
    area: AREA,
    icon: Clapperboard,
    key: "videos",
    order: 50,
    placement: DASHBOARD_PLACEMENT.STAT,
    prefetch: (queryClient) => queryClient.query({ ...getVideosQuery, staleTime: "static" }),
    to: ROUTES.ADMIN_COURSES,
    useValue: () => useSuspenseQuery(getVideosQuery).data.total,
  },
  {
    Panel: lazyRouteComponent(() => import("~/src/presentation/components/custom/admin/courses/course-progress"), "CourseProgress"),
    Pending: CourseProgressPending,
    area: AREA,
    key: "progress",
    order: 30,
    placement: DASHBOARD_PLACEMENT.PANEL,
    prefetch: (queryClient) => queryClient.query({ ...courseProgressQuery, staleTime: "static" }),
  },
] as const satisfies readonly AdminDashboardEntry[]
