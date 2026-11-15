import { HTTP_STATUS } from "~/src/modules/_core/constants/api"

import { CONTENT_TYPE, type LiveSiteCheck } from "~/src/data/live.constants"

import { ROUTES } from "~/src/routes"

export const AUTH_LIVE_CHECKS = [
  { contentType: CONTENT_TYPE.JSON, path: `${ROUTES.API_AUTH_BASE}${ROUTES.API_AUTH.GET_SESSION}`, status: HTTP_STATUS.OK },
] as const satisfies readonly LiveSiteCheck[]
