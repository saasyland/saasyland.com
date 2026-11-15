import { describe, expect, it } from "vite-plus/test"

import { UNLISTED_ROUTES, isUnlistedRoute } from "~/src/data/unlisted"
import * as AREA_UNLISTED_ROUTES from "~/src/data/unlisted.entries"

import { ROUTES } from "~/src/routes"

describe("UNLISTED_ROUTES", () => {
  it("joins the paths every area keeps out of prerendering, once each", () => {
    const declared = Object.values(AREA_UNLISTED_ROUTES).flat()

    expect(UNLISTED_ROUTES.toSorted()).toStrictEqual(declared.toSorted())
    expect(new Set(UNLISTED_ROUTES).size).toBe(UNLISTED_ROUTES.length)
  })

  it("names only paths that ROUTES defines", () => {
    const paths = new Set<string>(Object.values(ROUTES).filter((value) => typeof value === "string"))

    expect(UNLISTED_ROUTES.filter((route) => !paths.has(route))).toStrictEqual([])
  })
})

describe("isUnlistedRoute", () => {
  it("treats every unlisted path and the paths below it as unlisted", () => {
    for (const route of UNLISTED_ROUTES) {
      expect(isUnlistedRoute(route)).toBe(true)
      expect(isUnlistedRoute(`${route}/nested`)).toBe(true)
    }
  })

  it.each([
    [`${ROUTES.API}/search`, true],
    [ROUTES.HOME, false],
    [`${ROUTES.API}docs`, false],
  ])("treats %s as unlisted: %s", (pathname, unlisted) => {
    expect(isUnlistedRoute(pathname)).toBe(unlisted)
  })
})
