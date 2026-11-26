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

import { COMMAND_SEARCHES } from "~/src/presentation/components/custom/admin/admin-command-palette"
import { USER_TABS } from "~/src/presentation/components/custom/admin/users/user-tabs"

import { ROUTES } from "~/src/routes"
import { routeTree } from "~/src/routeTree.gen"

const ADMIN_ITEMS = ADMIN_NAVIGATION.flatMap(({ items }) => items)

const FOOTER_LINKS = FOOTER_NAVIGATION.flatMap(({ links }) => links)

const MENUS: readonly { readonly entries: readonly NavigationEntry[]; readonly menu: string }[] = [
  { entries: ADMIN_ITEMS, menu: "admin" },
  { entries: ADMIN_COMMAND_ACTIONS, menu: "command" },
  { entries: ADMIN_DASHBOARD_ACTIONS, menu: "dashboard" },
  { entries: APP_NAVIGATION, menu: "app" },
  { entries: APP_RESOURCE_NAVIGATION, menu: "app resources" },
  { entries: HEADER_NAVIGATION, menu: "header" },
  { entries: FOOTER_LINKS, menu: "footer" },
  { entries: USER_TABS, menu: "user tabs" },
]

const ENTRIES = MENUS.flatMap(({ entries }) => entries)

const LABELS = [
  ...ENTRIES.map(({ label }) => label),
  ...[...HEADER_NAVIGATION, ...FOOTER_LINKS].flatMap(({ signedIn }) => (signedIn === undefined ? [] : [signedIn.label])),
  ...ADMIN_ITEMS.flatMap(({ breadcrumbs = {} }) => Object.values(breadcrumbs)),
  ...COMMAND_SEARCHES.map(({ label }) => label),
]

const ROUTE_PATHS = new Set(Object.keys(createTestRouter(ROUTES.HOME, routeTree).routesByPath))

describe("the menus", () => {
  it.each(MENUS)("gives every $menu entry its own label and page", ({ entries }) => {
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

  it.each(I18N.SUPPORTED_LOCALES)("labels every entry, signed-in variant, breadcrumb and command palette search in %s", (locale) => {
    const messages = getTestMessages(locale)

    for (const label of LABELS) {
      expect(messages).toHaveProperty(label.split("."), expect.stringMatching(/\S/u))
    }
  })
})
