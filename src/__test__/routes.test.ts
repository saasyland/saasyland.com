import { describe, expect, it } from "vite-plus/test"

import { ROUTE_PATHS } from "~/src/lib/route-paths"

import { REQUEST_RENDERED_ROUTES, ROUTES, isRequestRenderedRoute } from "~/src/routes"

describe("ROUTE_PATHS", () => {
  it("names every path by its keys in ROUTES", () => {
    expect(ROUTE_PATHS.get("HOME")).toBe(ROUTES.HOME)
    expect(ROUTE_PATHS.get("ADMIN.USERS.ALL")).toBe(ROUTES.ADMIN.USERS.ALL)
    expect(ROUTE_PATHS.get("API.AUTH.POLAR.WEBHOOKS")).toBe(ROUTES.API.AUTH.POLAR.WEBHOOKS)
    expect(ROUTE_PATHS.has("ADMIN")).toBe(false)
  })
})

describe("REQUEST_RENDERED_ROUTES", () => {
  it("names each path kept out of prerendering once, and only paths that ROUTES defines", () => {
    const paths = new Set(ROUTE_PATHS.values())

    expect(REQUEST_RENDERED_ROUTES.filter((route) => !paths.has(route))).toStrictEqual([])
    expect(new Set(REQUEST_RENDERED_ROUTES).size).toBe(REQUEST_RENDERED_ROUTES.length)
  })
})

describe("isRequestRenderedRoute", () => {
  it("treats every path the Worker renders for each request and the paths below it alike", () => {
    for (const route of REQUEST_RENDERED_ROUTES) {
      expect(isRequestRenderedRoute(route)).toBe(true)
      expect(isRequestRenderedRoute(`${route}/nested`)).toBe(true)
    }
  })

  it.each([
    [`${ROUTES.API.INDEX}/search`, true],
    [ROUTES.HOME, false],
    [`${ROUTES.API.INDEX}docs`, false],
  ])("treats %s as rendered for each request: %s", (pathname, rendered) => {
    expect(isRequestRenderedRoute(pathname)).toBe(rendered)
  })
})
