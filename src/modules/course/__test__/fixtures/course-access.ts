import { linkOptions } from "@tanstack/react-router"
import { vi } from "vite-plus/test"

import { USERS } from "~/src/modules/course/__test__/fixtures/catalogue"

import type { CourseAccessGrant, CourseAccessUse } from "~/src/data/course-access"

import { ROUTES } from "~/src/routes"

export const TEST_COURSE_ACCESS = [
  {
    holders: "coursePassHolders",
    holds: (userId: string) => Promise.resolve(userId === USERS.ENTITLED),
    includedWith: ["coursePass"],
    key: "test",
    offer: "coursePass",
    price: 100,
    recordUse: vi.fn<(use: CourseAccessUse) => Promise<void>>(() => Promise.resolve()),
    unlock: (redirect: string) => linkOptions({ search: { redirect }, to: ROUTES.APP_LICENSE }),
  },
] as const satisfies readonly CourseAccessGrant[]
