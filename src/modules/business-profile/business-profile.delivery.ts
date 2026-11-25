import "@tanstack/react-start/server-only"

import { BUSINESS_LOGO_PATH_PREFIX, logoContentType } from "~/src/modules/business-profile/business-profile.logo"

import { serveStoredImage } from "~/src/lib/media-delivery"

const EDGE_CACHE_NAME = "logos"

const LOGO_PATH = new URLPattern({ pathname: `${BUSINESS_LOGO_PATH_PREFIX}/:file([0-9a-f\\-]{36}\\.[a-z]{3,4})` })

export const serveBusinessLogo = (request: Request): Promise<Response> =>
  serveStoredImage(request, { cacheName: EDGE_CACHE_NAME, contentType: logoContentType, pattern: LOGO_PATH })
