import { describe, expect, it } from "vite-plus/test"

import { createTestRouter } from "~/src/platform/testing/lib/render"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import {
  ADMIN_COMMAND_ACTIONS,
  ADMIN_DASHBOARD_ACTIONS,
  ADMIN_NAVIGATION,
  APP_NAVIGATION,
  APP_RESOURCE_NAVIGATION,
  FOOTER_NAVIGATION,
  HEADER_NAVIGATION,
} from "~/src/data/navigation"
import type { NavigationEntry } from "~/src/data/navigation.constants"

import * as ROUTES from "~/src/routes"
import { routeTree } from "~/src/routeTree.gen"

const ADMIN_ITEMS = ADMIN_NAVIGATION.flatMap(({ items }) => items)

const FOOTER_LINKS = FOOTER_NAVIGATION.flatMap(({ links }) => links)

const MENUS: readonly (readonly [string, readonly NavigationEntry[]])[] = [
  ["admin", ADMIN_ITEMS],
  ["command", ADMIN_COMMAND_ACTIONS],
  ["dashboard", ADMIN_DASHBOARD_ACTIONS],
  ["app", APP_NAVIGATION],
  ["app resources", APP_RESOURCE_NAVIGATION],
  ["header", HEADER_NAVIGATION],
  ["footer", FOOTER_LINKS],
]

const ENTRIES = MENUS.flatMap(([, entries]) => entries)

const LABELS = [
  ...ENTRIES.map(({ label }) => label),
  ...[...HEADER_NAVIGATION, ...FOOTER_LINKS].flatMap(({ signedIn }) => (signedIn === undefined ? [] : [signedIn.label])),
  ...ADMIN_ITEMS.flatMap(({ breadcrumbs = {} }) => Object.values(breadcrumbs)),
]

const ROUTE_PATHS = new Set(Object.keys(createTestRouter(ROUTES.HOME, routeTree).routesByPath))

describe("the menus", () => {
  it.each(MENUS)("gives every %s entry its own label and page", (_menu, entries) => {
    expect(new Set(entries.map(({ label }) => label)).size).toBe(entries.length)
    expect(new Set(entries.map(({ to }) => to)).size).toBe(entries.length)
  })

  it("keeps each admin group and footer column once, and none of them empty", () => {
    expect(new Set(ADMIN_NAVIGATION.map(({ key }) => key)).size).toBe(ADMIN_NAVIGATION.length)
    expect(new Set(FOOTER_NAVIGATION.map(({ key }) => key)).size).toBe(FOOTER_NAVIGATION.length)
    expect(
      [...ADMIN_NAVIGATION.map(({ items }) => items), ...FOOTER_NAVIGATION.map(({ links }) => links)].filter(({ length }) => length === 0),
    ).toStrictEqual([])
  })

  it("points every entry at a page of the route tree", () => {
    expect(ENTRIES.map(({ to }) => to).filter((to) => !ROUTE_PATHS.has(to))).toStrictEqual([])
  })

  it.each(I18N.SUPPORTED_LOCALES)("labels every entry, signed-in variant and breadcrumb in %s", (locale) => {
    const messages = getTestMessages(locale)

    for (const label of LABELS) {
      expect(messages).toHaveProperty(label.split("."), expect.stringMatching(/\S/u))
    }
  })
})
