import { describe, expect, it } from "vite-plus/test"

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
import { ADMIN_NAVIGATION_GROUP, FOOTER_COLUMN } from "~/src/data/navigation.constants"

import { REPOSITORY_FACTS } from "~/src/lib/repository-facts"

import { COMMAND_SEARCHES } from "~/src/presentation/components/custom/admin/admin-command-palette"
import { USER_TABS } from "~/src/presentation/components/custom/admin/users/user-tabs"

import sidebarMessages from "~/messages/en-US/pages.admin.sidebar.json"
import { loadLocaleMessages } from "~/scripts/i18n-messages"
import * as ROUTES from "~/src/routes"

const NAVIGATION = "navigation"
const NAVIGATION_MESSAGES = loadLocaleMessages(I18N.DEFAULT_LOCALE)[NAVIGATION]

const leafKeys = (value: unknown, prefix: string): string[] => {
  if (typeof value !== "object" || value === null) {
    return [prefix]
  }

  return Object.entries(value).flatMap(([key, nested]) => leafKeys(nested, prefix.length > 0 ? `${prefix}.${key}` : key))
}

const LABELS = leafKeys(NAVIGATION_MESSAGES, NAVIGATION)

const PATHS = new Set(Object.values(ROUTES).filter((route) => typeof route === "string"))

const ADMIN_ITEMS = ADMIN_NAVIGATION.flatMap(({ items }) => items)

const SITE_ENTRIES = [...HEADER_NAVIGATION, ...FOOTER_NAVIGATION.flatMap(({ links }) => links)]

const ENTRY_LABELS = [
  ...[
    ...ADMIN_ITEMS,
    ...ADMIN_COMMAND_ACTIONS,
    ...ADMIN_DASHBOARD_ACTIONS,
    ...APP_NAVIGATION,
    ...APP_RESOURCE_NAVIGATION,
    ...SITE_ENTRIES,
    ...USER_TABS,
    ...COMMAND_SEARCHES,
  ].map(({ label }) => label),
  ...SITE_ENTRIES.flatMap(({ signedIn }) => (signedIn === undefined ? [] : [signedIn.label])),
  ...ADMIN_ITEMS.flatMap(({ breadcrumbs = {} }) => Object.values(breadcrumbs)),
]

describe("the website's navigation", () => {
  it("arranges the website's menus in their order", () => {
    expect(ADMIN_NAVIGATION.map(({ items, key }) => [key, items.map(({ to }) => to)])).toStrictEqual([
      [ADMIN_NAVIGATION_GROUP.OVERVIEW, [ROUTES.ADMIN]],
      [ADMIN_NAVIGATION_GROUP.OFFERINGS, [ROUTES.ADMIN_PRODUCTS]],
      [ADMIN_NAVIGATION_GROUP.SALES, [ROUTES.ADMIN_ORDERS]],
      [ADMIN_NAVIGATION_GROUP.CONTENT, [ROUTES.ADMIN_COURSES]],
      [ADMIN_NAVIGATION_GROUP.ADMINISTRATION, [ROUTES.ADMIN_USERS, ROUTES.ADMIN_SETTINGS]],
    ])
    expect(ADMIN_DASHBOARD_ACTIONS.map(({ to }) => to)).toStrictEqual([ROUTES.ADMIN_ORDERS, ROUTES.ADMIN_USERS_CUSTOMERS])
    expect(APP_NAVIGATION.map(({ to }) => to)).toStrictEqual([ROUTES.APP, ROUTES.APP_LICENSE, ROUTES.COURSES, ROUTES.APP_SETTINGS])
    expect(HEADER_NAVIGATION.map(({ to }) => to)).toStrictEqual([ROUTES.HOME, ROUTES.COURSES, ROUTES.BLOG, ROUTES.DOCS, ROUTES.SIGN_IN])
    expect(FOOTER_NAVIGATION.map(({ key, links }) => [key, links.map(({ to }) => to)])).toStrictEqual([
      [FOOTER_COLUMN.PRODUCT, [ROUTES.DOCS, ROUTES.BLOG, ROUTES.AFFILIATES, ROUTES.SIGN_IN]],
      [FOOTER_COLUMN.LEGAL, [ROUTES.PRIVACY, ROUTES.TERMS, ROUTES.REFUNDS, ROUTES.WITHDRAWAL, ROUTES.LICENCE]],
    ])
  })

  it("labels exactly the admin groups in the admin sidebar", () => {
    expect(Object.keys(sidebarMessages.groups).toSorted()).toStrictEqual(ADMIN_NAVIGATION.map(({ key }) => key).toSorted())
  })

  it("labels exactly the menu entries, user tabs and command palette searches, and gives breadcrumbs only to pages below a section", () => {
    expect(LABELS.toSorted()).toStrictEqual([...new Set(ENTRY_LABELS)].toSorted())
    expect(
      ADMIN_ITEMS.flatMap(({ breadcrumbs = {}, to }) => Object.keys(breadcrumbs).map((action) => `${to}/${action}`)).filter(
        (path) => !PATHS.has(path),
      ),
    ).toStrictEqual([])
  })

  it("counts every admin section on the landing page", () => {
    expect(REPOSITORY_FACTS.adminSections).toBe(ADMIN_ITEMS.length)
  })
})
