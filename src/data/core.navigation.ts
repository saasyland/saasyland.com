import { MARKETING_SECTION_IDS, NAVIGATION_PLACEMENT, type NavigationEntry } from "~/src/data/navigation.constants"

import { ROUTES } from "~/src/routes"

const AREA = "core"

export const CORE_NAVIGATION = [
  { area: AREA, hash: MARKETING_SECTION_IDS.PRICING, key: "pricing", order: 10, placement: NAVIGATION_PLACEMENT.HEADER, to: ROUTES.HOME },
] as const satisfies readonly NavigationEntry[]
