import { GraduationCap, SquarePen } from "lucide-react"

import { ADMIN_NAVIGATION_GROUP, NAVIGATION_PLACEMENT, type NavigationEntry } from "~/src/data/navigation.constants"

import { ROUTES } from "~/src/routes"

const AREA = "courses"

export const COURSES_NAVIGATION = [
  {
    area: AREA,
    group: ADMIN_NAVIGATION_GROUP.CONTENT,
    icon: GraduationCap,
    key: "courses",
    order: 20,
    placement: NAVIGATION_PLACEMENT.ADMIN,
    to: ROUTES.ADMIN_COURSES,
  },
  { area: AREA, icon: GraduationCap, key: "courses", order: 25, placement: NAVIGATION_PLACEMENT.APP, to: ROUTES.COURSES },
  {
    area: AREA,
    icon: SquarePen,
    key: "newCourse",
    order: 10,
    placement: NAVIGATION_PLACEMENT.COMMAND,
    to: ROUTES.ADMIN_COURSES_CREATE,
  },
  { area: AREA, key: "courses", order: 20, placement: NAVIGATION_PLACEMENT.HEADER, to: ROUTES.COURSES },
] as const satisfies readonly NavigationEntry[]
