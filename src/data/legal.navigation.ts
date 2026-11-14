import { FOOTER_COLUMN, NAVIGATION_PLACEMENT, type NavigationEntry } from "~/src/data/navigation.constants"

import { ROUTES } from "~/src/routes"

export const LEGAL_NAVIGATION = [
  { column: FOOTER_COLUMN.PRODUCT, key: "affiliates", order: 30, placement: NAVIGATION_PLACEMENT.FOOTER, to: ROUTES.AFFILIATES },
  { column: FOOTER_COLUMN.LEGAL, key: "privacy", order: 10, placement: NAVIGATION_PLACEMENT.FOOTER, to: ROUTES.PRIVACY },
  { column: FOOTER_COLUMN.LEGAL, key: "terms", order: 20, placement: NAVIGATION_PLACEMENT.FOOTER, to: ROUTES.TERMS },
  { column: FOOTER_COLUMN.LEGAL, key: "refunds", order: 30, placement: NAVIGATION_PLACEMENT.FOOTER, to: ROUTES.REFUNDS },
  { column: FOOTER_COLUMN.LEGAL, key: "licence", order: 40, placement: NAVIGATION_PLACEMENT.FOOTER, to: ROUTES.LICENCE },
] as const satisfies readonly NavigationEntry[]
