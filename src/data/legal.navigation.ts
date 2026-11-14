import { FOOTER_COLUMN, NAVIGATION_PLACEMENT, type NavigationEntry } from "~/src/data/navigation.constants"

import { ROUTES } from "~/src/routes"

const AREA = "legal"

export const LEGAL_NAVIGATION = [
  {
    area: AREA,
    column: FOOTER_COLUMN.PRODUCT,
    key: "affiliates",
    order: 30,
    placement: NAVIGATION_PLACEMENT.FOOTER,
    to: ROUTES.AFFILIATES,
  },
  { area: AREA, column: FOOTER_COLUMN.LEGAL, key: "privacy", order: 10, placement: NAVIGATION_PLACEMENT.FOOTER, to: ROUTES.PRIVACY },
  { area: AREA, column: FOOTER_COLUMN.LEGAL, key: "terms", order: 20, placement: NAVIGATION_PLACEMENT.FOOTER, to: ROUTES.TERMS },
  { area: AREA, column: FOOTER_COLUMN.LEGAL, key: "refunds", order: 30, placement: NAVIGATION_PLACEMENT.FOOTER, to: ROUTES.REFUNDS },
  { area: AREA, column: FOOTER_COLUMN.LEGAL, key: "licence", order: 40, placement: NAVIGATION_PLACEMENT.FOOTER, to: ROUTES.LICENCE },
] as const satisfies readonly NavigationEntry[]
