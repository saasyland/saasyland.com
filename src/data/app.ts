import { Home, KeyRound } from "lucide-react"

import { LICENSE_TIER } from "~/src/modules/license/license.constants"

import { ROUTES } from "~/src/routes"

export const APP_NAVIGATION = [
  { icon: Home, label: "overview", url: ROUTES.APP },
  { icon: KeyRound, label: "license", url: ROUTES.APP_LICENSE },
] as const

export const APP_LICENSE_TIERS = [LICENSE_TIER.CORE, LICENSE_TIER.COMPLETE, LICENSE_TIER.AGENCY] as const
