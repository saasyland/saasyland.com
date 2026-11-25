import { describe, expect, it } from "vite-plus/test"

import * as ROUTES from "~/src/routes"

describe("REQUEST_RENDERED_ROUTES", () => {
  it("names each path kept out of prerendering once, and only paths that ROUTES defines", () => {
    const paths = new Set<string>(Object.values(ROUTES).filter((value) => typeof value === "string"))

    expect(ROUTES.REQUEST_RENDERED_ROUTES.filter((route) => !paths.has(route))).toStrictEqual([])
    expect(new Set(ROUTES.REQUEST_RENDERED_ROUTES).size).toBe(ROUTES.REQUEST_RENDERED_ROUTES.length)
  })
})

describe("isRequestRenderedRoute", () => {
  it("treats every path the Worker renders for each request and the paths below it alike", () => {
    for (const route of ROUTES.REQUEST_RENDERED_ROUTES) {
      expect(ROUTES.isRequestRenderedRoute(route)).toBe(true)
      expect(ROUTES.isRequestRenderedRoute(`${route}/nested`)).toBe(true)
    }
  })

  it.each([
    [`${ROUTES.API}/search`, true],
    [ROUTES.HOME, false],
    [`${ROUTES.API}docs`, false],
  ])("treats %s as rendered for each request: %s", (pathname, rendered) => {
    expect(ROUTES.isRequestRenderedRoute(pathname)).toBe(rendered)
  })
})
