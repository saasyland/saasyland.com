import * as AREAS from "./shared.entries.ts"

export interface SharedArea {
  readonly unlisted?: readonly string[]
}

export const SHARED_AREAS: readonly SharedArea[] = Object.values(AREAS)

export const UNLISTED_ROUTES = SHARED_AREAS.flatMap(({ unlisted = [] }) => unlisted).toSorted()

export const isUnlistedRoute = (pathname: string): boolean =>
  UNLISTED_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))
