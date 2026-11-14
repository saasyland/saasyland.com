import { Clapperboard, GraduationCap } from "lucide-react"

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
  {
    area: AREA,
    group: ADMIN_NAVIGATION_GROUP.CONTENT,
    icon: Clapperboard,
    key: "videos",
    order: 30,
    placement: NAVIGATION_PLACEMENT.ADMIN,
    to: ROUTES.ADMIN_VIDEOS,
  },
  { area: AREA, key: "courses", order: 10, placement: NAVIGATION_PLACEMENT.HEADER, to: ROUTES.COURSES },
] as const satisfies readonly NavigationEntry[]
