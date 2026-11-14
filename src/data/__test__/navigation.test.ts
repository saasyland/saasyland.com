import { describe, expect, it, vi } from "vite-plus/test"

import { CORE_NAVIGATION } from "~/src/data/core.navigation"
import { ADMIN_DASHBOARD_ACTIONS, ADMIN_NAVIGATION, APP_NAVIGATION, FOOTER_NAVIGATION, NAVIGATION_PAGES } from "~/src/data/navigation"
import {
  ADMIN_NAVIGATION_GROUP,
  ADMIN_NAVIGATION_GROUPS,
  FOOTER_COLUMN,
  FOOTER_COLUMNS,
  NAVIGATION_PLACEMENT,
} from "~/src/data/navigation.constants"
import * as AREA_NAVIGATION from "~/src/data/navigation.entries"
import { REPOSITORY_FACTS } from "~/src/data/repository-facts"

import sidebarMessages from "~/messages/en-US/pages.admin.sidebar.json"
import { ROUTES } from "~/src/routes"

const ENTRIES = Object.values(AREA_NAVIGATION).flat()

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

  it("arranges the website's navigation as before the areas contributed it", () => {
    expect(ADMIN_NAVIGATION.map(({ items, key }) => [key, items.map(({ to }) => to)])).toStrictEqual([
      [ADMIN_NAVIGATION_GROUP.OVERVIEW, [ROUTES.ADMIN, ROUTES.ADMIN_ANALYTICS]],
      [ADMIN_NAVIGATION_GROUP.OFFERINGS, [ROUTES.ADMIN_PRODUCTS, ROUTES.ADMIN_PRICING]],
      [ADMIN_NAVIGATION_GROUP.CONTENT, [ROUTES.ADMIN_BLOG, ROUTES.ADMIN_COURSES, ROUTES.ADMIN_VIDEOS, ROUTES.ADMIN_LANDING_PAGE]],
      [ADMIN_NAVIGATION_GROUP.ADMINISTRATION, [ROUTES.ADMIN_USERS, ROUTES.ADMIN_PAYMENTS, ROUTES.ADMIN_SETTINGS]],
    ])
    expect(ADMIN_DASHBOARD_ACTIONS.map(({ to }) => to)).toStrictEqual([ROUTES.ADMIN_PRODUCTS_CREATE])
    expect(APP_NAVIGATION.map(({ to }) => to)).toStrictEqual([ROUTES.APP, ROUTES.APP_LICENSE, ROUTES.APP_SETTINGS])
    expect(NAVIGATION_PAGES.map(({ to }) => to)).toStrictEqual([ROUTES.COURSES, ROUTES.BLOG, ROUTES.DOCS])
    expect(FOOTER_NAVIGATION.map(({ key, links }) => [key, links.map(({ to }) => to)])).toStrictEqual([
      [FOOTER_COLUMN.PRODUCT, [ROUTES.DOCS, ROUTES.BLOG, ROUTES.AFFILIATES, ROUTES.SIGN_IN]],
      [FOOTER_COLUMN.LEGAL, [ROUTES.PRIVACY, ROUTES.TERMS, ROUTES.REFUNDS, ROUTES.LICENCE]],
    ])
  })

  it("labels exactly the admin sections and counts them on the landing page", () => {
    const sections = ADMIN_ITEMS.map(({ key }) => key)

    expect(Object.keys(sidebarMessages.links).toSorted()).toStrictEqual(sections.toSorted())
    expect(Object.keys(sidebarMessages.groups).toSorted()).toStrictEqual(ADMIN_NAVIGATION.map(({ key }) => key).toSorted())
    expect(new Set(ADMIN_ITEMS.map(({ to }) => to)).size).toBe(ADMIN_ITEMS.length)
    expect(REPOSITORY_FACTS.adminSections).toBe(sections.length)
  })

  it("leaves out every group, column and list no area contributes to", async () => {
    vi.resetModules()
    vi.doMock(import("~/src/data/navigation.entries"), () => ({ CORE_NAVIGATION }))

    const navigation = await import("~/src/data/navigation")

    expect(navigation.ADMIN_NAVIGATION.map(({ items, key }) => [key, items.map(({ to }) => to)])).toStrictEqual([
      [ADMIN_NAVIGATION_GROUP.OVERVIEW, [ROUTES.ADMIN]],
      [ADMIN_NAVIGATION_GROUP.ADMINISTRATION, [ROUTES.ADMIN_SETTINGS]],
    ])
    expect(navigation.APP_NAVIGATION.map(({ to }) => to)).toStrictEqual([ROUTES.APP, ROUTES.APP_SETTINGS])
    expect(navigation.ADMIN_DASHBOARD_ACTIONS).toStrictEqual([])
    expect(navigation.FOOTER_NAVIGATION).toStrictEqual([])
    expect(navigation.NAVIGATION_PAGES).toStrictEqual([])
    vi.doUnmock("~/src/data/navigation.entries")
  })
})
