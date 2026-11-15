import type { LiveSiteCheck } from "~/src/data/live.constants"
import * as AREA_LIVE_CHECKS from "~/src/data/live.entries"

const AREAS: Readonly<Record<string, readonly LiveSiteCheck[]>> = AREA_LIVE_CHECKS

export const LIVE_SITE_CHECKS = Object.values(AREAS).flat()
