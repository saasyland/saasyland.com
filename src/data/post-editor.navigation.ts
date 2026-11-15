import { BookOpen } from "lucide-react"

import { ADMIN_NAVIGATION_GROUP, FEATURE_STATUS, NAVIGATION_PLACEMENT, type NavigationEntry } from "~/src/data/navigation.constants"

import { ROUTES } from "~/src/routes"

const AREA = "post-editor"

export const POST_EDITOR_NAVIGATION = [
  {
    area: AREA,
    group: ADMIN_NAVIGATION_GROUP.CONTENT,
    icon: BookOpen,
    key: "blog",
    order: 10,
    placement: NAVIGATION_PLACEMENT.ADMIN,
    status: FEATURE_STATUS.ARRIVING,
    to: ROUTES.ADMIN_BLOG,
  },
] as const satisfies readonly NavigationEntry[]
