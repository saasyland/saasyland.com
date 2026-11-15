import { KeyRound } from "lucide-react"

import { NAVIGATION_PLACEMENT, type NavigationEntry } from "~/src/data/navigation.constants"

import { ROUTES } from "~/src/routes"

const AREA = "license"

export const LICENSE_NAVIGATION = [
  { area: AREA, icon: KeyRound, key: "license", order: 20, placement: NAVIGATION_PLACEMENT.APP, to: ROUTES.APP_LICENSE },
] as const satisfies readonly NavigationEntry[]
