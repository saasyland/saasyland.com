import { BookOpen } from "lucide-react"

import { FOOTER_COLUMN, NAVIGATION_PLACEMENT, type NavigationArea } from "~/src/data/navigation.constants"

import * as ROUTES from "~/src/routes"

export const CONTENT_NAVIGATION = {
  entries: [
    { key: "blog", order: 30, placement: NAVIGATION_PLACEMENT.HEADER, to: ROUTES.BLOG },
    { key: "docs", order: 40, placement: NAVIGATION_PLACEMENT.HEADER, to: ROUTES.DOCS },
    { column: FOOTER_COLUMN.PRODUCT, key: "docs", order: 10, placement: NAVIGATION_PLACEMENT.FOOTER, to: ROUTES.DOCS },
    { column: FOOTER_COLUMN.PRODUCT, key: "blog", order: 20, placement: NAVIGATION_PLACEMENT.FOOTER, to: ROUTES.BLOG },
    { icon: BookOpen, key: "docs", order: 10, placement: NAVIGATION_PLACEMENT.APP_RESOURCES, to: ROUTES.DOCS },
  ],
  name: "content",
} as const satisfies NavigationArea
