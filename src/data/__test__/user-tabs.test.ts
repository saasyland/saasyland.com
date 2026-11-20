import { describe, expect, expectTypeOf, it, vi } from "vite-plus/test"

import { AUTH_USER_TABS } from "~/src/data/auth.user-tabs"
import { USER_TABS } from "~/src/data/user-tabs"
import * as AREA_USER_TABS from "~/src/data/user-tabs.entries"

import type { FileRouteTypes } from "~/src/routeTree.gen"

const ENTRIES = Object.values(AREA_USER_TABS).flat()

describe("user management tabs", () => {
  it("orders the tabs every area adds, each with its own key and page", () => {
    expect(USER_TABS.map(({ order }) => order)).toStrictEqual(ENTRIES.map(({ order }) => order).toSorted((first, second) => first - second))
    expect(new Set(USER_TABS.map(({ key }) => key)).size).toBe(ENTRIES.length)
    expect(new Set(USER_TABS.map(({ to }) => to)).size).toBe(ENTRIES.length)
  })

  it("points every tab at a path of the route tree", () => {
    expectTypeOf<(typeof ENTRIES)[number]["to"]>().toExtend<FileRouteTypes["to"]>()
  })

  it("orders the tabs of several areas by their order, not by their area", async () => {
    const [allUsers] = AUTH_USER_TABS
    const exports = { ...allUsers, area: "reports", key: "exports", order: allUsers.order - 1 }
    vi.resetModules()
    vi.doMock("~/src/data/user-tabs.entries", () => ({ AUTH_USER_TABS, REPORTS_USER_TABS: [exports] }))

    const tabs = await import("~/src/data/user-tabs")

    expect(tabs.USER_TABS.map(({ key }) => key)).toStrictEqual([exports.key, allUsers.key])
    vi.doUnmock("~/src/data/user-tabs.entries")
  })

  it("keeps only the auth area's tabs when no other area adds one", async () => {
    vi.resetModules()
    vi.doMock("~/src/data/user-tabs.entries", () => ({ AUTH_USER_TABS }))

    const tabs = await import("~/src/data/user-tabs")

    expect(tabs.USER_TABS).toStrictEqual(AUTH_USER_TABS)
    vi.doUnmock("~/src/data/user-tabs.entries")
  })
})
