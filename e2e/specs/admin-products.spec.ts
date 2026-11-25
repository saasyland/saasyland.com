import { toMinorUnits } from "../../src/modules/_core/constants/currency"
import * as ROUTES from "../../src/routes"
import { TEST_ACCOUNTS } from "../data/accounts"
import { TEST_CATEGORY, TEST_PRODUCTS } from "../data/products"
import { expect, test } from "../fixtures/auth"
import { filterByOption, gridOf, hideColumn, removeFilter, resetLayout, showColumn, sortBy } from "../fixtures/data-grid"
import { APP_NAVIGATION_WAIT_UNTIL } from "../pages/base-page"
import pagesAdminProductsMessages from "../../messages/en-US/pages.admin.products.json" with { type: "json" }

const [admin] = TEST_ACCOUNTS

test("the product list shows each seeded product's price in its currency, and the categories tab lists the seeded category", async ({
  appPage,
  authPage,
  page,
}) => {
  await authPage.signIn(admin.email)
  await expect(page).toHaveURL(/\/admin\/?$/u)
  await page.goto(ROUTES.ADMIN_PRODUCTS, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()

  for (const { currency, name, price, shown } of TEST_PRODUCTS) {
    const row = page.getByRole("row").filter({ hasText: name })
    await expect(row).toContainText(shown)
    await expect(row).not.toContainText(String(toMinorUnits(price, currency)))
  }

  await page.getByRole("tab", { name: pagesAdminProductsMessages.tabs.categories }).click()
  await expect(page).toHaveURL(`${ROUTES.ADMIN_PRODUCTS}?tab=categories`)
  await expect(page.getByRole("row").filter({ hasText: TEST_CATEGORY.name })).toContainText(TEST_CATEGORY.description)
})

test("the admin filters the products by type, sorts them by type, hides a column and keeps the layout after a reload", async ({
  appPage,
  authPage,
  page,
}) => {
  await authPage.signIn(admin.email)
  await expect(page).toHaveURL(/\/admin\/?$/u)
  await page.goto(ROUTES.ADMIN_PRODUCTS, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
  const { headers, typeLabels } = pagesAdminProductsMessages.table
  const grid = gridOf(page, pagesAdminProductsMessages.tabs.all)
  const rows = grid.locator("tbody tr")
  const [dollars, yen] = TEST_PRODUCTS

  await page.getByRole("searchbox", { name: pagesAdminProductsMessages.table.search }).fill("priced in")
  await expect(rows).toHaveCount(TEST_PRODUCTS.length)
  await filterByOption(grid, headers.type, typeLabels.subscription)
  await expect(rows).toHaveCount(1)
  await expect(rows).toContainText(yen.name)
  await removeFilter(grid, headers.type)
  await expect(rows).toHaveCount(TEST_PRODUCTS.length)

  await sortBy(grid, headers.type)
  await expect(grid.getByRole("columnheader", { name: new RegExp(`^${headers.type}`, "u") })).toHaveAttribute("aria-sort", "ascending")
  await expect(rows.first()).toContainText(dollars.name)
  await sortBy(grid, headers.type)
  await expect(rows.first()).toContainText(yen.name)

  const headerNames = grid.getByRole("columnheader")
  await hideColumn(grid, headers.status)
  await showColumn(grid, headers.createdAt)
  const arranged = ["", headers.product, headers.type, headers.pricing, headers.createdAt, headers.updatedAt]
  await expect(headerNames).toHaveText(arranged)
  await page.reload({ waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
  await expect(headerNames).toHaveText(arranged)
  await resetLayout(grid)
  await expect(headerNames).toHaveText(["", headers.product, headers.type, headers.pricing, headers.status, headers.updatedAt])
})
