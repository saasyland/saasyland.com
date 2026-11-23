import type { SharedArea } from "./shared.ts"

export const ADMIN_COURSES = "/admin/courses"
export const ADMIN_COURSES_CREATE = "/admin/courses/create"
export const COURSES = "/courses"

export const COURSES_SHARED = { unlisted: [COURSES] } as const satisfies SharedArea
