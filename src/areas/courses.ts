import { useSuspenseQuery } from "@tanstack/react-query"
import { lazyRouteComponent } from "@tanstack/react-router"
import { BookOpen, Clapperboard, GraduationCap } from "lucide-react"

import { searchCoursesQuery } from "~/src/modules/course/use-cases/search-courses"
import { courseProgressQuery } from "~/src/modules/lesson-progress/use-cases/get-course-progress"
import { searchLessonsQuery } from "~/src/modules/lesson/use-cases/search-lessons"
import { getVideosQuery } from "~/src/modules/video/use-cases/get-videos"

import type { BrowserArea } from "~/src/areas/browser"
import { DASHBOARD_PLACEMENT } from "~/src/data/dashboard.constants"

import { CourseProgressPending } from "~/src/presentation/components/custom/admin/courses/course-progress-pending"

import * as ROUTES from "~/src/routes"

export const COURSES_BROWSER = {
  appBadges: [
    {
      Badge: lazyRouteComponent(() => import("~/src/presentation/components/custom/courses/course-progress-badge"), "CourseProgressBadge"),
      to: ROUTES.COURSES,
    },
  ],
  commandSearches: [
    { icon: GraduationCap, key: "courses", order: 30, permission: { course: ["read"] }, query: searchCoursesQuery },
    { icon: BookOpen, key: "lessons", order: 40, permission: { course: ["read"] }, query: searchLessonsQuery },
  ],
  dashboard: [
    {
      icon: GraduationCap,
      key: "learners",
      order: 40,
      placement: DASHBOARD_PLACEMENT.STAT,
      prefetch: (queryClient) => queryClient.query({ ...courseProgressQuery, staleTime: "static" }),
      to: ROUTES.ADMIN_COURSES,
      useValue: () => useSuspenseQuery(courseProgressQuery).data.learners,
    },
    {
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
      key: "progress",
      order: 30,
      placement: DASHBOARD_PLACEMENT.PANEL,
      prefetch: (queryClient) => queryClient.query({ ...courseProgressQuery, staleTime: "static" }),
    },
  ],
  name: "courses",
} as const satisfies BrowserArea
