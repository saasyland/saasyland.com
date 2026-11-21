import { toMinorUnits } from "../../src/modules/_core/constants/currency"
import { ROUTES } from "../../src/routes"
import { TEST_ACCOUNTS } from "../data/accounts"
import { TEST_CATEGORY, TEST_PRODUCTS } from "../data/products"
import { expect, test } from "../fixtures/auth"
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
