import { afterEach, describe, expect, expectTypeOf, it, vi } from "vite-plus/test"

import { type BrowserArea, ROOT_COMPONENTS, layoutNamespaces } from "~/src/areas/browser"
import * as AREAS from "~/src/areas/browser.entries"

import type { FileRouteTypes } from "~/src/routeTree.gen"

type DeclaredLayout = Extract<
  (typeof AREAS)[keyof typeof AREAS],
  { readonly layoutNamespaces: unknown }
>["layoutNamespaces"][number]["layout"]

const DECLARED: readonly BrowserArea[] = Object.values(AREAS)

const LAYOUT_NAMESPACES = DECLARED.flatMap(({ layoutNamespaces: entries = [] }) => entries)

const SAMPLE_LAYOUT = "/sample"

const SampleWidget = () => <p>Sample</p>

const useLosAngeles = () => "America/Los_Angeles"

const useTokyo = () => "Asia/Tokyo"

const composeWith = (areas: Readonly<Record<string, BrowserArea>>) => {
  vi.resetModules()
  vi.doMock("~/src/areas/browser.entries", () => areas)

  return import("~/src/areas/browser")
}

afterEach(() => {
  vi.doUnmock("~/src/areas/browser.entries")
})

describe("layout namespaces", () => {
  it("gives each layout the namespaces every area adds to it, once each", () => {
    for (const layout of new Set(LAYOUT_NAMESPACES.map((entry) => entry.layout))) {
      const declared = LAYOUT_NAMESPACES.filter((entry) => entry.layout === layout).flatMap(({ namespaces }) => namespaces)

      expect(layoutNamespaces(layout)).toStrictEqual(declared)
      expect(new Set(declared).size).toBe(declared.length)
    }
  })

  it("names a layout route of the route tree for every entry", () => {
    expectTypeOf<Exclude<DeclaredLayout, FileRouteTypes["id"]>>().toBeNever()
  })

  it("adds nothing to a layout no area adds to", async () => {
    const browser = await composeWith({
      SAMPLE_BROWSER: { layoutNamespaces: [{ layout: SAMPLE_LAYOUT, namespaces: ["sample"] }], name: "sample" },
    })

    expect(browser.layoutNamespaces(SAMPLE_LAYOUT)).toStrictEqual(["sample"])
    expect(browser.layoutNamespaces(`${SAMPLE_LAYOUT}/other`)).toStrictEqual([])
  })
})

describe("root components", () => {
  it("mounts every component an area adds to the root once, under a key no other area uses", () => {
    const keys = ROOT_COMPONENTS.map(({ key }) => key)

    expect(ROOT_COMPONENTS).toStrictEqual(DECLARED.flatMap(({ rootComponents = [] }) => rootComponents))
    expect(new Set(keys).size).toBe(keys.length)
  })

  it("mounts the components of every area in the order the areas are declared", async () => {
    const first = { component: SampleWidget, key: "first" }
    const second = { component: SampleWidget, key: "second" }

    const browser = await composeWith({
      FIRST_BROWSER: { name: "first", rootComponents: [first] },
      SECOND_BROWSER: { name: "second", rootComponents: [second] },
    })

    expect(browser.ROOT_COMPONENTS).toStrictEqual([first, second])
  })
})

describe("time zone hooks", () => {
  it("joins the time zone of every area that has one, in the order the areas are declared", async () => {
    const browser = await composeWith({
      FIRST_BROWSER: { name: "first", useTimeZone: useLosAngeles },
      PLAIN_BROWSER: { name: "plain" },
      SECOND_BROWSER: { name: "second", useTimeZone: useTokyo },
    })

    expect(browser.TIME_ZONE_HOOKS).toStrictEqual([useLosAngeles, useTokyo])
  })

  it("has no time zone when no area supplies one", async () => {
    const browser = await composeWith({ CORE_BROWSER: { name: "core" } })

    expect(browser.TIME_ZONE_HOOKS).toStrictEqual([])
  })
})
