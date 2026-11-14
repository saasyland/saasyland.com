import { describe, expect, it } from "vite-plus/test"

import { ADMIN_DASHBOARD_ACTIONS, ADMIN_NAVIGATION, APP_NAVIGATION, FOOTER_NAVIGATION, NAVIGATION_PAGES } from "~/src/data/navigation"
import { ADMIN_NAVIGATION_GROUP, FOOTER_COLUMN } from "~/src/data/navigation.constants"
import { REPOSITORY_FACTS } from "~/src/data/repository-facts"

import { ROUTES } from "~/src/routes"

describe("the website's navigation", () => {
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

  it("counts the admin sections on the landing page", () => {
    expect(REPOSITORY_FACTS.adminSections).toBe(ADMIN_NAVIGATION.flatMap(({ items }) => items).length)
  })
})
