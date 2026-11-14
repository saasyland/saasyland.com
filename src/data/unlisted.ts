import * as AREA_UNLISTED_ROUTES from "./unlisted.entries.ts"

export const UNLISTED_ROUTES = Object.values(AREA_UNLISTED_ROUTES).flat().toSorted()

export const isUnlistedRoute = (pathname: string): boolean =>
  UNLISTED_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))
