import { Home, Settings } from "lucide-react"
import { describe, expect, expectTypeOf, it, vi } from "vite-plus/test"

import * as AREAS from "~/src/areas/navigation.entries"
import {
  ADMIN_COMMAND_ACTIONS,
  ADMIN_DASHBOARD_ACTIONS,
  ADMIN_NAVIGATION,
  APP_NAVIGATION,
  APP_RESOURCE_NAVIGATION,
  FOOTER_NAVIGATION,
  HEADER_NAVIGATION,
} from "~/src/data/navigation"
import {
  ADMIN_NAVIGATION_GROUP,
  ADMIN_NAVIGATION_GROUPS,
  FOOTER_COLUMNS,
  NAVIGATION_PLACEMENT,
  type NavigationArea,
} from "~/src/data/navigation.constants"

import * as ROUTES from "~/src/routes"
import type { FileRouteTypes } from "~/src/routeTree.gen"

type DeclaredEntry = (typeof AREAS)[keyof typeof AREAS]["entries"][number]

const ENTRIES = Object.values(AREAS).flatMap(({ entries }): readonly DeclaredEntry[] => entries)

const SAMPLE_NAVIGATION = {
  entries: [
    {
      group: ADMIN_NAVIGATION_GROUP.ADMINISTRATION,
      icon: Settings,
      key: "settings",
      order: 10,
      placement: NAVIGATION_PLACEMENT.ADMIN,
      to: ROUTES.API,
    },
    { icon: Home, key: "home", order: 10, placement: NAVIGATION_PLACEMENT.APP, to: ROUTES.HOME },
  ],
  name: "sample",
} as const satisfies NavigationArea

const SAMPLE_AREAS = { SAMPLE_NAVIGATION }

const ADMIN_ITEMS = ADMIN_NAVIGATION.flatMap(({ items }) => items)

const FOOTER_LINKS = FOOTER_NAVIGATION.flatMap(({ links }) => links)

const PLACEMENT_LISTS = [
  [NAVIGATION_PLACEMENT.ADMIN, ADMIN_ITEMS],
  [NAVIGATION_PLACEMENT.COMMAND, ADMIN_COMMAND_ACTIONS],
  [NAVIGATION_PLACEMENT.DASHBOARD, ADMIN_DASHBOARD_ACTIONS],
  [NAVIGATION_PLACEMENT.APP, APP_NAVIGATION],
  [NAVIGATION_PLACEMENT.APP_RESOURCES, APP_RESOURCE_NAVIGATION],
  [NAVIGATION_PLACEMENT.HEADER, HEADER_NAVIGATION],
  [NAVIGATION_PLACEMENT.FOOTER, FOOTER_LINKS],
] as const

const ORDERED_LISTS = [
  ...ADMIN_NAVIGATION.map(({ items, key }) => [`${NAVIGATION_PLACEMENT.ADMIN} ${key}`, items] as const),
  [NAVIGATION_PLACEMENT.COMMAND, ADMIN_COMMAND_ACTIONS] as const,
  [NAVIGATION_PLACEMENT.DASHBOARD, ADMIN_DASHBOARD_ACTIONS] as const,
  [NAVIGATION_PLACEMENT.APP, APP_NAVIGATION] as const,
  [NAVIGATION_PLACEMENT.APP_RESOURCES, APP_RESOURCE_NAVIGATION] as const,
  [NAVIGATION_PLACEMENT.HEADER, HEADER_NAVIGATION] as const,
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
    expect(ADMIN_NAVIGATION.map(({ key }) => key)).toStrictEqual(
      ADMIN_NAVIGATION_GROUPS.filter((group) =>
        ENTRIES.some((entry) => entry.placement === NAVIGATION_PLACEMENT.ADMIN && entry.group === group),
      ),
    )
    expect(FOOTER_NAVIGATION.map(({ key }) => key)).toStrictEqual(
      FOOTER_COLUMNS.filter((column) =>
        ENTRIES.some((entry) => entry.placement === NAVIGATION_PLACEMENT.FOOTER && entry.column === column),
      ),
    )
    expect(ADMIN_NAVIGATION.every(({ items, key }) => items.every(({ group }) => group === key))).toBe(true)
    expect(FOOTER_NAVIGATION.every(({ key, links }) => links.every(({ column }) => column === key))).toBe(true)
  })

  it("links each admin section once", () => {
    expect(new Set(ADMIN_ITEMS.map(({ to }) => to)).size).toBe(ADMIN_ITEMS.length)
  })

  it("names each entry after its area and leaves out every group, column and list no area contributes to", async () => {
    vi.resetModules()
    vi.doMock("~/src/areas/navigation.entries", () => SAMPLE_AREAS)

    const navigation = await import("~/src/data/navigation")

    expect(navigation.ADMIN_NAVIGATION.map(({ items, key }) => [key, items.map(({ to }) => to)])).toStrictEqual([
      [ADMIN_NAVIGATION_GROUP.ADMINISTRATION, [ROUTES.API]],
    ])
    expect(navigation.APP_NAVIGATION.map(({ area, to }) => [area, to])).toStrictEqual([[SAMPLE_NAVIGATION.name, ROUTES.HOME]])
    expect(navigation.APP_RESOURCE_NAVIGATION).toStrictEqual([])
    expect(navigation.ADMIN_COMMAND_ACTIONS).toStrictEqual([])
    expect(navigation.ADMIN_DASHBOARD_ACTIONS).toStrictEqual([])
    expect(navigation.FOOTER_NAVIGATION).toStrictEqual([])
    expect(navigation.HEADER_NAVIGATION).toStrictEqual([])
    vi.doUnmock("~/src/areas/navigation.entries")
  })
})
