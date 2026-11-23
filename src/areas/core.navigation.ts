import { MARKETING_SECTION_IDS, NAVIGATION_PLACEMENT, type NavigationArea } from "~/src/data/navigation.constants"

import * as ROUTES from "~/src/routes"

export const CORE_NAVIGATION = {
  entries: [{ hash: MARKETING_SECTION_IDS.PRICING, key: "pricing", order: 10, placement: NAVIGATION_PLACEMENT.HEADER, to: ROUTES.HOME }],
  name: "core",
} as const satisfies NavigationArea
