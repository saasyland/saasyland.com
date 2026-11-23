import { describe, expect, it } from "vite-plus/test"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import * as NAVIGATION_AREAS from "~/src/areas/navigation.entries"
import { COMMAND_SEARCHES } from "~/src/data/command-search"
import { ADMIN_DASHBOARD_ACTIONS, ADMIN_NAVIGATION, APP_NAVIGATION, FOOTER_NAVIGATION, HEADER_NAVIGATION } from "~/src/data/navigation"
import { ADMIN_NAVIGATION_GROUP, FOOTER_COLUMN } from "~/src/data/navigation.constants"
import { REPOSITORY_FACTS } from "~/src/data/repository-facts"
import { USER_TABS } from "~/src/data/user-tabs"

import sidebarMessages from "~/messages/en-US/pages.admin.sidebar.json"
import { loadLocaleMessages } from "~/scripts/i18n-messages"
import * as ROUTES from "~/src/routes"

const NAVIGATION_MESSAGES = loadLocaleMessages(I18N.DEFAULT_LOCALE)["navigation"]
const BREADCRUMBS = "breadcrumbs"
const USER_TABS_GROUP = "userTabs"
const COMMAND_SEARCH_GROUP = "search"

const leafKeys = (value: unknown, prefix: string): string[] => {
  if (typeof value !== "object" || value === null) {
    return [prefix]
  }

  return Object.entries(value).flatMap(([key, nested]) => leafKeys(nested, prefix.length > 0 ? `${prefix}.${key}` : key))
}

const LABELS = leafKeys(NAVIGATION_MESSAGES, "")

const SECTION_ACTIONS = Object.values(ROUTES).flatMap((route) => {
  const [, admin, section, action] = typeof route === "string" ? route.split("/") : []
  const item = ADMIN_NAVIGATION.flatMap(({ items }) => items).find(({ to }) => to === `/${admin}/${section}`)

  return item === undefined || action === undefined ? [] : [`${item.area}.${BREADCRUMBS}.${action}`]
})

describe("the website's navigation", () => {
  it("arranges the website's navigation as before the areas contributed it", () => {
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

  it("labels exactly the entries, user tabs and command palette searches that the areas declare, and only breadcrumbs of their sections", () => {
    const entryLabels = Object.values(NAVIGATION_AREAS).flatMap(({ entries, name }) =>
      entries.flatMap(({ key, placement, ...entry }) =>
        [key, ...("signedIn" in entry ? [entry.signedIn.key] : [])].map((label) => `${name}.${placement}.${label}`),
      ),
    )
    const tabLabels = USER_TABS.map(({ area, key }) => `${area}.${USER_TABS_GROUP}.${key}`)
    const searchLabels = COMMAND_SEARCHES.map(({ area, key }) => `${area}.${COMMAND_SEARCH_GROUP}.${key}`)

    expect(LABELS.filter((label) => !label.includes(`.${BREADCRUMBS}.`)).toSorted()).toStrictEqual(
      [...new Set([...entryLabels, ...tabLabels, ...searchLabels])].toSorted(),
    )
    expect(SECTION_ACTIONS).toEqual(expect.arrayContaining(LABELS.filter((label) => label.includes(`.${BREADCRUMBS}.`))))
  })

  it("counts every admin section on the landing page", () => {
    expect(REPOSITORY_FACTS.adminSections).toBe(ADMIN_NAVIGATION.flatMap(({ items }) => items).length)
  })
})
