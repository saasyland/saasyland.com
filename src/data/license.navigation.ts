import { KeyRound } from "lucide-react"

import { FOOTER_COLUMN, NAVIGATION_PLACEMENT, type NavigationEntry } from "~/src/data/navigation.constants"

import * as ROUTES from "~/src/routes"

const AREA = "license"

export const LICENSE_NAVIGATION = [
  { area: AREA, icon: KeyRound, key: "license", order: 20, placement: NAVIGATION_PLACEMENT.APP, to: ROUTES.APP_LICENSE },
  { area: AREA, column: FOOTER_COLUMN.LEGAL, key: "withdrawal", order: 35, placement: NAVIGATION_PLACEMENT.FOOTER, to: ROUTES.WITHDRAWAL },
] as const satisfies readonly NavigationEntry[]
