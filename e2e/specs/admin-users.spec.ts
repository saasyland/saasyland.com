import { TEST_ACCOUNTS } from "../data/accounts"
import { expect, test } from "../fixtures/test"
import { APP_NAVIGATION_WAIT_UNTIL } from "../pages/base-page"

const [admin] = TEST_ACCOUNTS

test("admin sorts the user table by name and selects every row", async ({ appPage, authPage, page }) => {
  await authPage.signIn(admin.email)
  await expect(page).toHaveURL(/\/admin\/?$/u)
  await appPage.waitForAppReady()
  await page.goto("/admin/users/all", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()

  const table = page.getByRole("table")
  const userHeader = table.getByRole("columnheader", { name: /^User/u })
  const names = table.locator("tbody tr td:nth-child(2) p:first-child")
  await userHeader.getByRole("button", { name: /^User/u }).click()
  await expect(userHeader).toHaveAttribute("aria-sort", "ascending")
  await expect(table.getByRole("checkbox", { name: "Select row" }).first()).toBeVisible()
  const ascending = await names.allTextContents()
  expect(ascending.length).toBeGreaterThan(1)
  expect(ascending).toEqual(ascending.toSorted())
  await userHeader.getByRole("button", { name: /^User/u }).click()
  await expect(userHeader).toHaveAttribute("aria-sort", "descending")
  await expect(table.getByRole("checkbox", { name: "Select row" }).first()).toBeVisible()
  const descending = await names.allTextContents()
  expect(descending.length).toBeGreaterThan(1)
  expect(descending).toEqual(descending.toSorted().toReversed())
  await table.locator("label").filter({ has: page.getByRole("checkbox", { name: "Select all rows" }) }).click()
  await expect(table.getByRole("checkbox", { name: "Select row" }).first()).toBeChecked()
  await expect(table.getByRole("checkbox", { name: "Select row" }).last()).toBeChecked()
})
