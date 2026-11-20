import { linkOptions } from "@tanstack/react-router"

import { USERS } from "~/src/modules/course/__test__/fixtures/catalogue"

import type { CourseAccessGrant } from "~/src/data/course-access"

import { ROUTES } from "~/src/routes"

export const TEST_COURSE_ACCESS = [
  {
    holders: "coursePassHolders",
    holds: (userId: string) => Promise.resolve(userId === USERS.ENTITLED),
    includedWith: ["coursePass"],
    key: "test",
    offer: "coursePass",
    price: 100,
    unlock: (redirect: string) => linkOptions({ search: { redirect }, to: ROUTES.APP_LICENSE }),
  },
] as const satisfies readonly CourseAccessGrant[]
