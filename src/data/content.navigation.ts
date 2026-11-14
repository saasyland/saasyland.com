import { FOOTER_COLUMN, NAVIGATION_PLACEMENT, type NavigationEntry } from "~/src/data/navigation.constants"

import { ROUTES } from "~/src/routes"

export const CONTENT_NAVIGATION = [
  { key: "blog", order: 20, placement: NAVIGATION_PLACEMENT.HEADER, to: ROUTES.BLOG },
  { key: "docs", order: 30, placement: NAVIGATION_PLACEMENT.HEADER, to: ROUTES.DOCS },
  { column: FOOTER_COLUMN.PRODUCT, key: "docs", order: 10, placement: NAVIGATION_PLACEMENT.FOOTER, to: ROUTES.DOCS },
  { column: FOOTER_COLUMN.PRODUCT, key: "blog", order: 20, placement: NAVIGATION_PLACEMENT.FOOTER, to: ROUTES.BLOG },
] as const satisfies readonly NavigationEntry[]
