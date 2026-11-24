import { linkOptions } from "@tanstack/react-router"
import { vi } from "vite-plus/test"

import { USERS } from "~/src/modules/course/__test__/fixtures/catalogue"
import type * as LessonAccess from "~/src/modules/lesson/lesson.access"

import * as ROUTES from "~/src/routes"

const TEST_GRANT = {
  holders: "coursePassHolders",
  holds: (userId: string) => Promise.resolve(userId === USERS.ENTITLED),
  includedWith: ["coursePass"],
  key: "test",
  offer: "coursePass",
  price: 100,
  recordUse: vi.fn<(use: LessonAccess.CourseAccessUse) => Promise<void>>(() => Promise.resolve()),
  unlock: (redirect: string) => linkOptions({ search: { redirect }, to: ROUTES.APP_LICENSE }),
} as const satisfies LessonAccess.CourseAccessGrant

export const TEST_COURSE_ACCESS = [TEST_GRANT] as const

export const withTestCourseAccess = async (importOriginal: () => Promise<typeof LessonAccess>): Promise<typeof LessonAccess> => ({
  ...(await importOriginal()),
  COURSE_ACCESS_GRANTS: TEST_COURSE_ACCESS,
  holdsCourseAccess: TEST_GRANT.holds,
  recordCourseAccessUse: TEST_GRANT.recordUse,
})
