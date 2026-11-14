import { Home, KeyRound, Settings } from "lucide-react"
import * as zod from "zod"

import { LICENSE_TIER } from "~/src/modules/license/license.constants"

import { searchParam } from "~/src/lib/search-params"

import { ROUTES } from "~/src/routes"

export const APP_NAVIGATION = [
  { icon: Home, label: "overview", url: ROUTES.APP },
  { icon: KeyRound, label: "license", url: ROUTES.APP_LICENSE },
  { icon: Settings, label: "settings", url: ROUTES.APP_SETTINGS },
] as const

export const appSearchSchema = zod.object({
  checkoutId: searchParam(zod.uuid()),
  tier: searchParam(zod.enum(LICENSE_TIER)),
})
