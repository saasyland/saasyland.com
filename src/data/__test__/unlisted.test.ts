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
  it.each([
    [ROUTES.ADMIN, true],
    [ROUTES.ADMIN_COURSES, true],
    [ROUTES.SIGN_IN, true],
    [ROUTES.NEWSLETTER_CONFIRM, true],
    [ROUTES.COURSES, true],
    [ROUTES.HOME, false],
    [ROUTES.DOCS, false],
    [ROUTES.PREMIUM, false],
    [`${ROUTES.APP}lication`, false],
  ])("treats %s as unlisted: %s", (pathname, unlisted) => {
    expect(isUnlistedRoute(pathname)).toBe(unlisted)
  })
})
