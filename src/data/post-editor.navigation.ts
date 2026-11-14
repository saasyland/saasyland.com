import { BookOpen } from "lucide-react"

import { ADMIN_NAVIGATION_GROUP, NAVIGATION_PLACEMENT, type NavigationEntry } from "~/src/data/navigation.constants"

import { ROUTES } from "~/src/routes"

export const POST_EDITOR_NAVIGATION = [
  {
    group: ADMIN_NAVIGATION_GROUP.CONTENT,
    icon: BookOpen,
    key: "blog",
    order: 10,
    placement: NAVIGATION_PLACEMENT.ADMIN,
    to: ROUTES.ADMIN_BLOG,
  },
] as const satisfies readonly NavigationEntry[]
