import { ROLE_CODES } from "../../src/integrations/better-auth/auth.roles"
import { TEST_COURSE, TEST_LESSONS } from "./courses"
import type { PageEntry } from "./pages"

const [freeLesson, , paidLesson] = TEST_LESSONS

export const COURSES_PAGES = [
  { path: "/courses" },
  { path: `/courses/${TEST_COURSE.slug}` },
  { path: `/courses/${TEST_COURSE.slug}/${paidLesson.slug}` },
  { path: "/admin/courses", role: ROLE_CODES.ADMIN },
  { heading: "New course", path: "/admin/courses/create", role: ROLE_CODES.ADMIN },
  { path: `/admin/courses/${TEST_COURSE.id}`, role: ROLE_CODES.ADMIN },
  { path: `/admin/courses/${TEST_COURSE.id}/lessons/${freeLesson.id}`, role: ROLE_CODES.ADMIN },
  { path: "/admin/videos", role: ROLE_CODES.ADMIN },
] as const satisfies readonly PageEntry[]
