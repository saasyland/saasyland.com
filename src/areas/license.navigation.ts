import { KeyRound } from "lucide-react"

import { FOOTER_COLUMN, NAVIGATION_PLACEMENT, type NavigationArea } from "~/src/data/navigation.constants"

import * as ROUTES from "~/src/routes"

export const LICENSE_NAVIGATION = {
  entries: [
    { icon: KeyRound, key: "license", order: 20, placement: NAVIGATION_PLACEMENT.APP, to: ROUTES.APP_LICENSE },
    { column: FOOTER_COLUMN.LEGAL, key: "withdrawal", order: 35, placement: NAVIGATION_PLACEMENT.FOOTER, to: ROUTES.WITHDRAWAL },
  ],
  name: "license",
} as const satisfies NavigationArea
