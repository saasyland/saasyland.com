import { HTTP_STATUS } from "~/src/modules/_core/constants/api"

import { CONTENT_TYPE, type LiveSiteCheck } from "~/src/data/live.constants"

import { BLOG_FEED } from "~/src/lib/feed"

export const CONTENT_LIVE_CHECKS = [
  { contentType: CONTENT_TYPE.XML, path: BLOG_FEED.PATH, status: HTTP_STATUS.OK },
] as const satisfies readonly LiveSiteCheck[]
