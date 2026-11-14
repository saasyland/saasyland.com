import { linkOptions } from "@tanstack/react-router"

import { USERS } from "~/src/modules/course/__test__/fixtures/catalogue"

import type { CourseAccessGrant } from "~/src/data/course-access"

import { ROUTES } from "~/src/routes"

export const TEST_COURSE_ACCESS = [
  {
    holds: (userId: string) => Promise.resolve(userId === USERS.ENTITLED),
    includedWith: ["coursePass"],
    key: "test",
    unlock: { signedIn: linkOptions({ to: ROUTES.APP }), signedOut: linkOptions({ to: ROUTES.SIGN_UP }) },
  },
] as const satisfies readonly CourseAccessGrant[]
