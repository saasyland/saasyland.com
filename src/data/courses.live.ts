import { HTTP_STATUS } from "~/src/modules/_core/constants/api"

import { CONTENT_TYPE, type LiveSiteCheck } from "~/src/data/live.constants"

import { ROUTES } from "~/src/routes"

export const COURSES_LIVE_CHECKS = [
  { contentType: CONTENT_TYPE.HTML, path: ROUTES.COURSES, status: HTTP_STATUS.OK },
] as const satisfies readonly LiveSiteCheck[]
