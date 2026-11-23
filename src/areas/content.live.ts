import { CONTENT_TYPE, type LiveSiteCheck } from "~/src/data/live.constants"

import * as ROUTES from "~/src/routes"

export const CONTENT_LIVE_CHECKS = [{ contentType: CONTENT_TYPE.XML, path: ROUTES.BLOG_FEED }] as const satisfies readonly LiveSiteCheck[]
