import type { Locator, Page } from "@playwright/test"

import { POLAR_ORDER_STATUS } from "../../src/integrations/polar/polar.constants"
import { ROUTES } from "../../src/routes"
import { TEST_ACCOUNTS } from "../data/accounts"
import {
  TEST_BUYER_ORDERS,
  TEST_BUYER_SHOWN,
  TEST_ORDER_BILLING,
  TEST_ORDER_BUYER,
  TEST_ORDER_OTHER_COUNTRY,
  TEST_ORDER_PRODUCTS,
  TEST_REVENUE_ORDERS,
} from "../data/payments"
import { expect, test } from "../fixtures/auth"
import type { AuthPage } from "../pages"
import type { BasePage } from "../pages/base-page"
import navigationMessages from "../../messages/en-US/navigation.payments.json" with { type: "json" }
import customersMessages from "../../messages/en-US/pages.admin.customers.json" with { type: "json" }
import dataTableMessages from "../../messages/en-US/components.custom.data-table.json" with { type: "json" }
import ordersMessages from "../../messages/en-US/pages.admin.orders.json" with { type: "json" }
import licenseMessages from "../../messages/en-US/pages.admin.users.license.json" with { type: "json" }

const [admin] = TEST_ACCOUNTS
const [paidOrder, refundedOrder, otherCountryOrder] = TEST_BUYER_ORDERS
const [revenueOrder] = TEST_REVENUE_ORDERS
const { detail } = ordersMessages

const signInAsAdmin = async ({ appPage, authPage, page }: { appPage: BasePage; authPage: AuthPage; page: Page }): Promise<void> => {
  await authPage.signIn(admin.email)
  await expect(page).toHaveURL(/\/admin\/?$/u)
  await appPage.waitForAppReady()
}

const chooseFilter = async (page: Page, label: string, option: string): Promise<void> => {
  await page.getByRole("button", { name: new RegExp(label, "u") }).click()
  await page.getByRole("option", { exact: true, name: option }).click()
}

const cardOf = (page: Page, title: string): Locator =>
  page.locator("[data-slot=card]").filter({ has: page.getByRole("heading", { exact: true, level: 2, name: title }) })

const valueIn = (card: Locator, term: string): Locator =>
  card.locator("dt").filter({ hasText: new RegExp(`^${term}$`, "u") }).locator("xpath=following-sibling::dd")

const valueOf = (page: Page, term: string): Locator => valueIn(cardOf(page, detail.mirror.title), term)

const polarValueOf = (page: Page, term: string): Locator => valueIn(cardOf(page, detail.polar.title), term)

test("the admin finds the buyer's orders by search, status and product, and opens one with Polar's live payment", async ({
  appPage,
  authPage,
  page,
}) => {
  await signInAsAdmin({ appPage, authPage, page })
  await page.getByRole("main").getByRole("link", { exact: true, name: navigationMessages.dashboard.orders }).click()
  await expect(page).toHaveURL(ROUTES.ADMIN_ORDERS)
  await expect(page.getByRole("heading", { level: 1, name: ordersMessages.title })).toBeVisible()

  const rows = page.getByRole("table").locator("tbody tr")
  await page.getByRole("textbox", { name: ordersMessages.filters.search }).fill(TEST_ORDER_BUYER.email)
  await expect(rows).toHaveCount(TEST_BUYER_ORDERS.length)
  for (const order of TEST_BUYER_ORDERS) {
    await expect(rows.filter({ hasText: order.id })).toContainText(ordersMessages.status[order.status])
  }

  await chooseFilter(page, ordersMessages.filters.status, ordersMessages.status[POLAR_ORDER_STATUS.REFUNDED])
  await expect(rows).toHaveCount(1)
  await expect(rows).toContainText("ord_test-buyer-refunded")
  await chooseFilter(page, ordersMessages.filters.status, ordersMessages.filters.status)

  await chooseFilter(page, ordersMessages.filters.product, TEST_ORDER_PRODUCTS.STARTER.name)
  await expect(rows).toHaveCount(1)
  await expect(rows).toContainText(TEST_BUYER_SHOWN.paidOrderTotal)

  await rows.getByRole("link", { name: new RegExp(paidOrder.id, "u") }).click()
  await expect(page).toHaveURL(`${ROUTES.ADMIN_ORDERS}/${paidOrder.id}`)
  await expect(page.getByRole("heading", { level: 1, name: TEST_ORDER_PRODUCTS.STARTER.name })).toBeVisible()
  await expect(polarValueOf(page, detail.polar.fields.discountName)).toHaveText(TEST_BUYER_SHOWN.discount)
  await expect(polarValueOf(page, detail.polar.fields.billingCountry)).toHaveText(TEST_ORDER_BILLING.countryName)
  await expect(polarValueOf(page, detail.polar.fields.billingName)).toHaveText(TEST_ORDER_BILLING.name)
  await expect(valueOf(page, detail.mirror.fields.discount)).toHaveText(TEST_BUYER_SHOWN.discount)
  await expect(valueOf(page, detail.mirror.fields.discountAmount)).toHaveText(TEST_BUYER_SHOWN.discountAmount)
  await expect(valueOf(page, detail.mirror.fields.billingCountry)).toHaveText(TEST_ORDER_BILLING.countryName)
  await expect(page.getByRole("link", { name: detail.polar.invoice })).toHaveAttribute("href", new RegExp(`${paidOrder.id}`, "u"))

  await page.getByRole("link", { exact: true, name: TEST_ORDER_BUYER.name }).click()
  await expect(page).toHaveURL(`${ROUTES.ADMIN_USERS}/${TEST_ORDER_BUYER.id}`)
  await expect(page.getByRole("main").getByRole("heading", { exact: true, level: 2, name: customersMessages.profile.title })).toBeVisible()
  await expect(page.getByText(licenseMessages.none)).toBeVisible()
  for (const amount of TEST_BUYER_SHOWN.revenue) {
    await expect(page.getByRole("main").getByText(amount, { exact: true }).first()).toBeVisible()
  }
})

test("the admin filters the buyer's orders by discount and billing country, and sees both in the list", async ({ appPage, authPage, page }) => {
  await signInAsAdmin({ appPage, authPage, page })
  await page.goto(ROUTES.ADMIN_ORDERS)
  await appPage.waitForAppReady()

  const rows = page.getByRole("table").locator("tbody tr")
  await page.getByRole("textbox", { name: ordersMessages.filters.search }).fill(TEST_ORDER_BUYER.email)
  await expect(rows).toHaveCount(TEST_BUYER_ORDERS.length)
  await expect(rows.filter({ hasText: paidOrder.id })).toContainText(TEST_BUYER_SHOWN.discount)
  await expect(rows.filter({ hasText: refundedOrder.id })).toContainText(ordersMessages.table.noDiscount)

  await chooseFilter(page, ordersMessages.filters.discount, ordersMessages.filters.discounts.any)
  await expect(rows).toHaveCount(1)
  await expect(rows).toContainText(paidOrder.id)
  await chooseFilter(page, ordersMessages.filters.discount, ordersMessages.filters.discounts.none)
  await expect(rows).toHaveCount(TEST_BUYER_ORDERS.length - 1)
  await expect(rows.filter({ hasText: paidOrder.id })).toHaveCount(0)
  await chooseFilter(page, ordersMessages.filters.discount, TEST_BUYER_SHOWN.discount)
  await expect(rows).toHaveCount(1)
  await expect(rows).toContainText(paidOrder.id)
  await chooseFilter(page, ordersMessages.filters.discount, ordersMessages.filters.discount)

  await chooseFilter(page, ordersMessages.filters.country, TEST_ORDER_OTHER_COUNTRY.countryName)
  await expect(rows).toHaveCount(1)
  await expect(rows).toContainText(otherCountryOrder.id)
  await expect(rows).toContainText(TEST_ORDER_OTHER_COUNTRY.countryName)
  await chooseFilter(page, ordersMessages.filters.country, TEST_ORDER_BILLING.countryName)
  await expect(rows).toHaveCount(TEST_BUYER_ORDERS.length - 1)

  await page.getByRole("textbox", { name: ordersMessages.filters.search }).fill("no-such-order")
  await expect(page.getByRole("cell", { name: dataTableMessages.empty, exact: true })).toBeVisible()
})

test("an order Polar does not answer for shows the saved copy and says Polar could not be reached", async ({ appPage, authPage, page }) => {
  await signInAsAdmin({ appPage, authPage, page })
  await page.goto(`${ROUTES.ADMIN_ORDERS}/${revenueOrder.id}`)
  await appPage.waitForAppReady()

  await expect(page.getByRole("status").filter({ hasText: detail.polar.unavailable.title })).toBeVisible()
  await expect(valueOf(page, detail.mirror.fields.total)).toHaveText("£129.00")
  await expect(page.getByText(detail.account.none)).toBeVisible()
})

test("the customers tab lists the buyer with their orders and what they paid after refunds, and opens their profile", async ({
  appPage,
  authPage,
  page,
}) => {
  await signInAsAdmin({ appPage, authPage, page })
  await page.getByRole("main").getByRole("link", { exact: true, name: navigationMessages.dashboard.customers }).click()
  await expect(page).toHaveURL(ROUTES.ADMIN_USERS_CUSTOMERS)

  await page.getByRole("textbox", { name: customersMessages.search }).fill(TEST_ORDER_BUYER.email)
  const row = page.getByRole("table").locator("tbody tr")
  await expect(row).toHaveCount(1)
  await expect(row.getByRole("cell").nth(3)).toHaveText(String(TEST_BUYER_ORDERS.length))
  await expect(row.getByRole("cell").nth(4)).toHaveText(TEST_BUYER_SHOWN.revenue.join(""))
  await expect(row.getByRole("cell").nth(2)).toHaveText(customersMessages.table.yes)

  await row.getByRole("link", { exact: true, name: TEST_ORDER_BUYER.name }).click()
  await expect(page).toHaveURL(`${ROUTES.ADMIN_USERS}/${TEST_ORDER_BUYER.id}`)
  await expect(page.getByRole("main").getByRole("link", { name: new RegExp(`^${TEST_ORDER_PRODUCTS.STARTER.name}`, "u") })).toHaveAttribute(
    "href",
    `${ROUTES.ADMIN_ORDERS}/${paidOrder.id}`,
  )
})
