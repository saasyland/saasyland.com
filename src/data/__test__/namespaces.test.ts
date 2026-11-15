import { describe, expect, expectTypeOf, it, vi } from "vite-plus/test"

import { layoutNamespaces } from "~/src/data/namespaces"
import * as AREA_NAMESPACES from "~/src/data/namespaces.entries"

import type { FileRouteTypes } from "~/src/routeTree.gen"

const ENTRIES = Object.values(AREA_NAMESPACES).flat()

const SAMPLE_LAYOUT = "/sample"

const SAMPLE_AREA_NAMESPACES = { SAMPLE_NAMESPACES: [{ layout: SAMPLE_LAYOUT, namespaces: ["sample"] }] }

describe("layout namespaces", () => {
  it("gives each layout the namespaces every area adds to it, once each", () => {
    for (const layout of new Set(ENTRIES.map((entry) => entry.layout))) {
      const declared = ENTRIES.filter((entry) => entry.layout === layout).flatMap(({ namespaces }) => namespaces)

      expect(layoutNamespaces(layout)).toStrictEqual(declared)
      expect(new Set(declared).size).toBe(declared.length)
    }
  })

  it("names a layout route of the route tree for every entry", () => {
    expectTypeOf<(typeof ENTRIES)[number]["layout"]>().toExtend<FileRouteTypes["id"]>()
  })

  it("adds nothing to a layout no area adds to", async () => {
    vi.resetModules()
    vi.doMock("~/src/data/namespaces.entries", () => SAMPLE_AREA_NAMESPACES)

    const namespaces = await import("~/src/data/namespaces")

    expect(namespaces.layoutNamespaces(SAMPLE_LAYOUT)).toStrictEqual(["sample"])
    expect(namespaces.layoutNamespaces(`${SAMPLE_LAYOUT}/other`)).toStrictEqual([])
    vi.doUnmock("~/src/data/namespaces.entries")
  })
})
