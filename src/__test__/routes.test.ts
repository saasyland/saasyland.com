import { describe, expect, it } from "vite-plus/test"

import * as ROUTES from "~/src/routes"

describe("UNLISTED_ROUTES", () => {
  it("names each path kept out of prerendering once, and only paths that ROUTES defines", () => {
    const paths = new Set<string>(Object.values(ROUTES).filter((value) => typeof value === "string"))

    expect(ROUTES.UNLISTED_ROUTES.filter((route) => !paths.has(route))).toStrictEqual([])
    expect(new Set(ROUTES.UNLISTED_ROUTES).size).toBe(ROUTES.UNLISTED_ROUTES.length)
  })
})

describe("isUnlistedRoute", () => {
  it("treats every unlisted path and the paths below it as unlisted", () => {
    for (const route of ROUTES.UNLISTED_ROUTES) {
      expect(ROUTES.isUnlistedRoute(route)).toBe(true)
      expect(ROUTES.isUnlistedRoute(`${route}/nested`)).toBe(true)
    }
  })

  it.each([
    [`${ROUTES.API}/search`, true],
    [ROUTES.HOME, false],
    [`${ROUTES.API}docs`, false],
  ])("treats %s as unlisted: %s", (pathname, unlisted) => {
    expect(ROUTES.isUnlistedRoute(pathname)).toBe(unlisted)
  })
})
