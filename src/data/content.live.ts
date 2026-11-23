import { HTTP_STATUS } from "~/src/modules/_core/constants/api"

import { CONTENT_TYPE, type LiveSiteCheck } from "~/src/data/live.constants"

import * as ROUTES from "~/src/routes"

export const CONTENT_LIVE_CHECKS = [
  { contentType: CONTENT_TYPE.XML, path: ROUTES.BLOG_FEED, status: HTTP_STATUS.OK },
] as const satisfies readonly LiveSiteCheck[]
