import { Home, Settings } from "lucide-react"
import { describe, expect, expectTypeOf, it, vi } from "vite-plus/test"

import { ADMIN_DASHBOARD_ACTIONS, ADMIN_NAVIGATION, APP_NAVIGATION, FOOTER_NAVIGATION, NAVIGATION_PAGES } from "~/src/data/navigation"
import {
  ADMIN_NAVIGATION_GROUP,
  ADMIN_NAVIGATION_GROUPS,
  FOOTER_COLUMNS,
  NAVIGATION_PLACEMENT,
  type NavigationEntry,
} from "~/src/data/navigation.constants"
import * as AREA_NAVIGATION from "~/src/data/navigation.entries"

import { ROUTES } from "~/src/routes"
import type { FileRouteTypes } from "~/src/routeTree.gen"

const ENTRIES = Object.values(AREA_NAVIGATION).flat()

const SAMPLE_AREA = "sample"

const SAMPLE_NAVIGATION = [
  {
    area: SAMPLE_AREA,
    group: ADMIN_NAVIGATION_GROUP.ADMINISTRATION,
    icon: Settings,
    key: "settings",
    order: 10,
    placement: NAVIGATION_PLACEMENT.ADMIN,
    to: ROUTES.API,
  },
  { area: SAMPLE_AREA, icon: Home, key: "home", order: 10, placement: NAVIGATION_PLACEMENT.APP, to: ROUTES.HOME },
] as const satisfies readonly NavigationEntry[]

const SAMPLE_AREA_NAVIGATION = { SAMPLE_NAVIGATION }

const ADMIN_ITEMS = ADMIN_NAVIGATION.flatMap(({ items }) => items)

const FOOTER_LINKS = FOOTER_NAVIGATION.flatMap(({ links }) => links)

const PLACEMENT_LISTS = [
  [NAVIGATION_PLACEMENT.ADMIN, ADMIN_ITEMS],
  [NAVIGATION_PLACEMENT.DASHBOARD, ADMIN_DASHBOARD_ACTIONS],
  [NAVIGATION_PLACEMENT.APP, APP_NAVIGATION],
  [NAVIGATION_PLACEMENT.HEADER, NAVIGATION_PAGES],
  [NAVIGATION_PLACEMENT.FOOTER, FOOTER_LINKS],
] as const

const ORDERED_LISTS = [
  ...ADMIN_NAVIGATION.map(({ items, key }) => [`${NAVIGATION_PLACEMENT.ADMIN} ${key}`, items] as const),
  [NAVIGATION_PLACEMENT.DASHBOARD, ADMIN_DASHBOARD_ACTIONS] as const,
  [NAVIGATION_PLACEMENT.APP, APP_NAVIGATION] as const,
  [NAVIGATION_PLACEMENT.HEADER, NAVIGATION_PAGES] as const,
  ...FOOTER_NAVIGATION.map(({ key, links }) => [`${NAVIGATION_PLACEMENT.FOOTER} ${key}`, links] as const),
]

const identity = ({ key, placement }: { readonly key: string; readonly placement: string }): string => `${placement}:${key}`

describe("navigation composition", () => {
  it("places every entry an area contributes exactly once", () => {
    const placed = PLACEMENT_LISTS.flatMap(([placement, list]) => list.map(({ key }) => identity({ key, placement })))

    expect(placed.toSorted()).toStrictEqual(ENTRIES.map((entry) => identity(entry)).toSorted())
  })

  it("points every entry an area declares at a path of the route tree", () => {
    expectTypeOf<(typeof ENTRIES)[number]["to"]>().toExtend<FileRouteTypes["to"]>()
  })

  it.each(PLACEMENT_LISTS)("gives every %s entry its own key", (_placement, list) => {
    const keys = list.map(({ key }) => key)

    expect(new Set(keys).size).toBe(keys.length)
  })

  it.each(ORDERED_LISTS)("lists the %s entries by distinct orders", (_list, entries) => {
    const orders = entries.map(({ order }) => order)

    expect(new Set(orders).size).toBe(orders.length)
    expect(orders).toStrictEqual(orders.toSorted((first, second) => first - second))
  })

  it("keeps admin groups and footer columns in their declared order, each holding only its own entries", () => {
    expect(ADMIN_NAVIGATION.map(({ key }) => key)).toStrictEqual(ADMIN_NAVIGATION_GROUPS)
    expect(FOOTER_NAVIGATION.map(({ key }) => key)).toStrictEqual(FOOTER_COLUMNS)
    expect(ADMIN_NAVIGATION.every(({ items, key }) => items.every(({ group }) => group === key))).toBe(true)
    expect(FOOTER_NAVIGATION.every(({ key, links }) => links.every(({ column }) => column === key))).toBe(true)
  })

  it("links each admin section once", () => {
    expect(new Set(ADMIN_ITEMS.map(({ to }) => to)).size).toBe(ADMIN_ITEMS.length)
  })

  it("leaves out every group, column and list no area contributes to", async () => {
    vi.resetModules()
    vi.doMock("~/src/data/navigation.entries", () => SAMPLE_AREA_NAVIGATION)

    const navigation = await import("~/src/data/navigation")

    expect(navigation.ADMIN_NAVIGATION.map(({ items, key }) => [key, items.map(({ to }) => to)])).toStrictEqual([
      [ADMIN_NAVIGATION_GROUP.ADMINISTRATION, [ROUTES.API]],
    ])
    expect(navigation.APP_NAVIGATION.map(({ to }) => to)).toStrictEqual([ROUTES.HOME])
    expect(navigation.ADMIN_DASHBOARD_ACTIONS).toStrictEqual([])
    expect(navigation.FOOTER_NAVIGATION).toStrictEqual([])
    expect(navigation.NAVIGATION_PAGES).toStrictEqual([])
    vi.doUnmock("~/src/data/navigation.entries")
  })
})
