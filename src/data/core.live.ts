import { HTTP_STATUS } from "~/src/modules/_core/constants/api"

import { CONTENT_TYPE, type LiveSiteCheck } from "~/src/data/live.constants"

import { ORGANIZATION_LOGO, SITEMAP_PATH, SOCIAL_IMAGE } from "~/src/lib/seo"

import { ROUTES } from "~/src/routes"

const ROBOTS_TXT = "/robots.txt"

export const CORE_LIVE_CHECKS = [
  { contentType: CONTENT_TYPE.HTML, path: ROUTES.HOME, status: HTTP_STATUS.OK },
  { contentType: CONTENT_TYPE.PLAIN_TEXT, path: ROBOTS_TXT, status: HTTP_STATUS.OK },
  { contentType: CONTENT_TYPE.XML, path: SITEMAP_PATH, status: HTTP_STATUS.OK },
  { contentType: SOCIAL_IMAGE.TYPE, path: SOCIAL_IMAGE.SITE_PATH, status: HTTP_STATUS.OK },
  { contentType: SOCIAL_IMAGE.TYPE, path: ORGANIZATION_LOGO.PATH, status: HTTP_STATUS.OK },
  { contentType: CONTENT_TYPE.JSON, path: ROUTES.API, status: HTTP_STATUS.OK },
] as const satisfies readonly LiveSiteCheck[]
