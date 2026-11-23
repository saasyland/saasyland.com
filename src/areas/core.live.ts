import { CONTENT_TYPE, type LiveSiteCheck } from "~/src/data/live.constants"

import { ORGANIZATION_LOGO, SITEMAP_PATH, SOCIAL_IMAGE } from "~/src/lib/seo"

import * as ROUTES from "~/src/routes"

const ROBOTS_TXT = "/robots.txt"

export const CORE_LIVE_CHECKS = [
  { contentType: CONTENT_TYPE.HTML, path: ROUTES.HOME },
  { contentType: CONTENT_TYPE.PLAIN_TEXT, path: ROBOTS_TXT },
  { contentType: CONTENT_TYPE.XML, path: SITEMAP_PATH },
  { contentType: SOCIAL_IMAGE.TYPE, path: SOCIAL_IMAGE.SITE_PATH },
  { contentType: SOCIAL_IMAGE.TYPE, path: ORGANIZATION_LOGO.PATH },
  { contentType: CONTENT_TYPE.JSON, path: ROUTES.API },
] as const satisfies readonly LiveSiteCheck[]
