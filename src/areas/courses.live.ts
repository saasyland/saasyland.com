import { CONTENT_TYPE, type LiveSiteCheck } from "~/src/data/live.constants"

import * as ROUTES from "~/src/routes"

export const COURSES_LIVE_CHECKS = [{ contentType: CONTENT_TYPE.HTML, path: ROUTES.COURSES }] as const satisfies readonly LiveSiteCheck[]
