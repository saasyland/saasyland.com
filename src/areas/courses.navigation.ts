import { GraduationCap, SquarePen } from "lucide-react"

import { ADMIN_NAVIGATION_GROUP, NAVIGATION_PLACEMENT, type NavigationArea } from "~/src/data/navigation.constants"

import * as ROUTES from "~/src/routes"

export const COURSES_NAVIGATION = {
  entries: [
    {
      group: ADMIN_NAVIGATION_GROUP.CONTENT,
      icon: GraduationCap,
      key: "courses",
      order: 20,
      placement: NAVIGATION_PLACEMENT.ADMIN,
      to: ROUTES.ADMIN_COURSES,
    },
    { icon: GraduationCap, key: "courses", order: 25, placement: NAVIGATION_PLACEMENT.APP, to: ROUTES.COURSES },
    {
      icon: SquarePen,
      key: "newCourse",
      order: 10,
      placement: NAVIGATION_PLACEMENT.COMMAND,
      to: ROUTES.ADMIN_COURSES_CREATE,
    },
    { key: "courses", order: 20, placement: NAVIGATION_PLACEMENT.HEADER, to: ROUTES.COURSES },
  ],
  name: "courses",
} as const satisfies NavigationArea
