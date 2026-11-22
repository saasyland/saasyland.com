import { useSuspenseQuery } from "@tanstack/react-query"
import { lazyRouteComponent } from "@tanstack/react-router"

import { courseProgressQuery } from "~/src/modules/lesson-progress/use-cases/get-course-progress"
import { getVideosQuery } from "~/src/modules/video/use-cases/get-videos"

import { type AdminDashboardEntry, DASHBOARD_PLACEMENT } from "~/src/data/dashboard.constants"

import { CourseProgressPending } from "~/src/presentation/components/custom/admin/courses/course-progress-pending"

const AREA = "courses"

export const COURSES_DASHBOARD = [
  {
    area: AREA,
    key: "learners",
    order: 40,
    placement: DASHBOARD_PLACEMENT.STAT,
    prefetch: (queryClient) => queryClient.query({ ...courseProgressQuery, staleTime: "static" }),
    useValue: () => useSuspenseQuery(courseProgressQuery).data.learners,
  },
  {
    area: AREA,
    key: "videos",
    order: 50,
    placement: DASHBOARD_PLACEMENT.STAT,
    prefetch: (queryClient) => queryClient.query({ ...getVideosQuery, staleTime: "static" }),
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
