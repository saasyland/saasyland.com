import type { Locator, Page } from "@playwright/test"

import { POLAR_ORGANIZATION_SLUG } from "../../src/integrations/polar/polar.constants"
import { ROUTES } from "../../src/routes"
import { TEST_ACCOUNTS } from "../data/accounts"
import { TEST_CATALOGUE, TEST_CATALOGUE_SEARCH, TEST_CATALOGUE_SHOWN } from "../data/products"
import { expect, test } from "../fixtures/auth"
import { filterByOption, gridOf, hideColumn, removeFilter, resetLayout, sortBy } from "../fixtures/data-grid"
import type { AuthPage } from "../pages"
import { APP_NAVIGATION_WAIT_UNTIL, type BasePage } from "../pages/base-page"
import productsMessages from "../../messages/en-US/pages.admin.products.json" with { type: "json" }

const [admin] = TEST_ACCOUNTS
const { headers, statusLabels } = productsMessages.table

const openProducts = async ({ appPage, authPage, page }: { appPage: BasePage; authPage: AuthPage; page: Page }): Promise<Locator> => {
  await authPage.signIn(admin.email)
  await expect(page).toHaveURL(/\/admin\/?$/u)
  await page.goto(ROUTES.ADMIN.PRODUCTS, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
  return gridOf(page, productsMessages.title)
}

const rowOf = (grid: Locator, name: string): Locator => grid.locator("tbody tr").filter({ hasText: name })

test("the product list shows the Polar catalogue with each product's prices, licence key and status, and its sales and what buyers paid from the copies of the orders", async ({
  appPage,
  authPage,
  page,
}) => {
  const grid = await openProducts({ appPage, authPage, page })
  const { ARCHIVE, KIT, PLAN } = TEST_CATALOGUE

  const kit = rowOf(grid, KIT.name)
  await expect(kit).toContainText(KIT.description)
  await expect(kit).toContainText(TEST_CATALOGUE_SHOWN.KIT.price)
  await expect(kit).toContainText(TEST_CATALOGUE_SHOWN.KIT.licenseKey)
  await expect(kit).toContainText(statusLabels.public)
  await expect(kit.locator("td").nth(5)).toHaveText(TEST_CATALOGUE_SHOWN.KIT.sales)
  await expect(kit).toContainText(TEST_CATALOGUE_SHOWN.KIT.revenue)
  await expect(kit.getByRole("link", { name: `Open ${KIT.name} in Polar` })).toHaveAttribute(
    "href",
    new RegExp(`/dashboard/${POLAR_ORGANIZATION_SLUG}/products/${KIT.id}$`, "u"),
  )

  const plan = rowOf(grid, PLAN.name)
  await expect(plan).toContainText(TEST_CATALOGUE_SHOWN.PLAN.price)
  await expect(plan).toContainText(productsMessages.table.unlimitedMachines)
  await expect(plan).toContainText(statusLabels.private)
  await expect(plan.locator("td").nth(5)).toHaveText(TEST_CATALOGUE_SHOWN.PLAN.sales)
  await expect(plan).toContainText(TEST_CATALOGUE_SHOWN.PLAN.revenue)

  const archive = rowOf(grid, ARCHIVE.name)
  await expect(archive).toContainText(TEST_CATALOGUE_SHOWN.ARCHIVE.price)
  await expect(archive).toContainText(productsMessages.table.noLicenseKey)
  await expect(archive).toContainText(statusLabels.archived)
  await expect(archive.locator("td").nth(5)).toHaveText(TEST_CATALOGUE_SHOWN.ARCHIVE.sales)
  await expect(archive).toContainText(productsMessages.table.noRevenue)
})

test("the admin searches the products, filters them by status, sorts them by sales both ways, hides a column and keeps the layout after a reload", async ({
  appPage,
  authPage,
  page,
}) => {
  const grid = await openProducts({ appPage, authPage, page })
  const rows = grid.locator("tbody tr")
  const { ARCHIVE, KIT, PLAN } = TEST_CATALOGUE

  await page.getByRole("searchbox", { name: productsMessages.table.search }).fill(TEST_CATALOGUE_SEARCH)
  await expect(rows).toHaveCount(Object.keys(TEST_CATALOGUE).length)
  await filterByOption(grid, headers.status, statusLabels.archived)
  await expect(rows).toHaveCount(1)
  await expect(rows).toContainText(ARCHIVE.name)
  await removeFilter(grid, headers.status)
  await expect(rows).toHaveCount(Object.keys(TEST_CATALOGUE).length)

  const salesHeader = grid.getByRole("columnheader", { name: new RegExp(`^${headers.sales}`, "u") })
  await sortBy(grid, headers.sales)
  await expect(salesHeader).toHaveAttribute("aria-sort", "descending")
  await expect(rows.first()).toContainText(KIT.name)
  await sortBy(grid, headers.sales)
  await expect(salesHeader).toHaveAttribute("aria-sort", "ascending")
  await expect(rows.first()).toContainText(ARCHIVE.name)
  await expect(rows.nth(1)).toContainText(PLAN.name)

  const headerNames = grid.getByRole("columnheader")
  await hideColumn(grid, headers.licenseKeys)
  const arranged = ["", headers.product, headers.prices, headers.status, headers.sales, headers.revenue, headers.polar]
  await expect(headerNames).toHaveText(arranged)
  await page.reload({ waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
  await expect(headerNames).toHaveText(arranged)
  await resetLayout(grid)
  await expect(headerNames).toHaveText([
    "",
    headers.product,
    headers.prices,
    headers.licenseKeys,
    headers.status,
    headers.sales,
    headers.revenue,
    headers.polar,
  ])
})
