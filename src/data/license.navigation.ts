import { KeyRound } from "lucide-react"

import { NAVIGATION_PLACEMENT, type NavigationEntry } from "~/src/data/navigation.constants"

import { ROUTES } from "~/src/routes"

export const LICENSE_NAVIGATION = [
  { icon: KeyRound, key: "license", order: 20, placement: NAVIGATION_PLACEMENT.APP, to: ROUTES.APP_LICENSE },
] as const satisfies readonly NavigationEntry[]
