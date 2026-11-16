import { BookOpen } from "lucide-react"

import { FOOTER_COLUMN, NAVIGATION_PLACEMENT, type NavigationEntry } from "~/src/data/navigation.constants"

import { ROUTES } from "~/src/routes"

const AREA = "content"

export const CONTENT_NAVIGATION = [
  { area: AREA, key: "blog", order: 30, placement: NAVIGATION_PLACEMENT.HEADER, to: ROUTES.BLOG },
  { area: AREA, key: "docs", order: 40, placement: NAVIGATION_PLACEMENT.HEADER, to: ROUTES.DOCS },
  { area: AREA, column: FOOTER_COLUMN.PRODUCT, key: "docs", order: 10, placement: NAVIGATION_PLACEMENT.FOOTER, to: ROUTES.DOCS },
  { area: AREA, column: FOOTER_COLUMN.PRODUCT, key: "blog", order: 20, placement: NAVIGATION_PLACEMENT.FOOTER, to: ROUTES.BLOG },
  { area: AREA, icon: BookOpen, key: "docs", order: 10, placement: NAVIGATION_PLACEMENT.APP_RESOURCES, to: ROUTES.DOCS },
] as const satisfies readonly NavigationEntry[]
