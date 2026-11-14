import { describe, expect, expectTypeOf, it, vi } from "vite-plus/test"

import { CORE_SKELETONS } from "~/src/data/core.skeletons"
import { ADMIN_SKELETONS } from "~/src/data/skeletons"
import * as AREA_SKELETONS from "~/src/data/skeletons.entries"

import { ROUTES } from "~/src/routes"
import type { FileRouteTypes } from "~/src/routeTree.gen"

const ENTRIES = Object.values(AREA_SKELETONS).flat()

describe("admin skeleton composition", () => {
  it("maps every admin page an area declares to its skeleton exactly once", () => {
    expect(ADMIN_SKELETONS.size).toBe(ENTRIES.length)
    for (const { pendingComponent, to } of ENTRIES) {
      expect(ADMIN_SKELETONS.get(to)).toBe(pendingComponent)
    }
  })

  it("names a path of the route tree for every admin page an area declares", () => {
    expectTypeOf<(typeof ENTRIES)[number]["to"]>().toExtend<FileRouteTypes["to"]>()
  })

  it("leaves out the pages of every area the project does not include", async () => {
    vi.resetModules()
    vi.doMock(import("~/src/data/skeletons.entries"), () => ({ CORE_SKELETONS }))

    const skeletons = await import("~/src/data/skeletons")

    expect([...skeletons.ADMIN_SKELETONS.keys()]).toStrictEqual([ROUTES.ADMIN, ROUTES.ADMIN_SETTINGS])
    vi.doUnmock("~/src/data/skeletons.entries")
  })
})
