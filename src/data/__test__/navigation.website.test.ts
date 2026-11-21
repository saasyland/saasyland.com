import { describe, expect, it } from "vite-plus/test"

import { ADMIN_DASHBOARD_ACTIONS, ADMIN_NAVIGATION, APP_NAVIGATION, FOOTER_NAVIGATION, HEADER_NAVIGATION } from "~/src/data/navigation"
import { ADMIN_NAVIGATION_GROUP, FOOTER_COLUMN } from "~/src/data/navigation.constants"
import { REPOSITORY_FACTS } from "~/src/data/repository-facts"

import sidebarMessages from "~/messages/en-US/pages.admin.sidebar.json"
import { ROUTES } from "~/src/routes"

describe("the website's navigation", () => {
  it("arranges the website's navigation as before the areas contributed it", () => {
    expect(ADMIN_NAVIGATION.map(({ items, key }) => [key, items.map(({ to }) => to)])).toStrictEqual([
      [ADMIN_NAVIGATION_GROUP.OVERVIEW, [ROUTES.ADMIN]],
      [ADMIN_NAVIGATION_GROUP.OFFERINGS, [ROUTES.ADMIN_PRODUCTS]],
      [ADMIN_NAVIGATION_GROUP.CONTENT, [ROUTES.ADMIN_COURSES, ROUTES.ADMIN_VIDEOS]],
      [ADMIN_NAVIGATION_GROUP.ADMINISTRATION, [ROUTES.ADMIN_USERS, ROUTES.ADMIN_SETTINGS]],
    ])
    expect(ADMIN_DASHBOARD_ACTIONS).toStrictEqual([])
    expect(APP_NAVIGATION.map(({ to }) => to)).toStrictEqual([ROUTES.APP, ROUTES.APP_LICENSE, ROUTES.COURSES, ROUTES.APP_SETTINGS])
    expect(HEADER_NAVIGATION.map(({ to }) => to)).toStrictEqual([ROUTES.HOME, ROUTES.COURSES, ROUTES.BLOG, ROUTES.DOCS, ROUTES.SIGN_IN])
    expect(FOOTER_NAVIGATION.map(({ key, links }) => [key, links.map(({ to }) => to)])).toStrictEqual([
      [FOOTER_COLUMN.PRODUCT, [ROUTES.DOCS, ROUTES.BLOG, ROUTES.AFFILIATES, ROUTES.SIGN_IN]],
      [FOOTER_COLUMN.LEGAL, [ROUTES.PRIVACY, ROUTES.TERMS, ROUTES.REFUNDS, ROUTES.LICENCE]],
    ])
  })

  it("labels exactly the admin groups in the admin sidebar", () => {
    expect(Object.keys(sidebarMessages.groups).toSorted()).toStrictEqual(ADMIN_NAVIGATION.map(({ key }) => key).toSorted())
  })

  it("counts every admin section on the landing page", () => {
    expect(REPOSITORY_FACTS.adminSections).toBe(ADMIN_NAVIGATION.flatMap(({ items }) => items).length)
  })
})
