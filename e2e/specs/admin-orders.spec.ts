import { readFile } from "node:fs/promises"

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
import gridMessages from "../../messages/en-US/components.custom.data-grid.json" with { type: "json" }
import ordersMessages from "../../messages/en-US/pages.admin.orders.json" with { type: "json" }
import licenseMessages from "../../messages/en-US/pages.admin.users.license.json" with { type: "json" }

const [admin] = TEST_ACCOUNTS
const [paidOrder, refundedOrder, otherCountryOrder] = TEST_BUYER_ORDERS
const [revenueOrder] = TEST_REVENUE_ORDERS
const { detail } = ordersMessages
const { headers } = ordersMessages.table

const signInAsAdmin = async ({ appPage, authPage, page }: { appPage: BasePage; authPage: AuthPage; page: Page }): Promise<void> => {
  await authPage.signIn(admin.email)
  await expect(page).toHaveURL(/\/admin\/?$/u)
  await appPage.waitForAppReady()
}

const { filters: gridFilters } = gridMessages

const rowsOf = (page: Page): Locator => page.getByRole("table", { name: ordersMessages.title }).locator("tbody tr")

const searchForBuyer = async (page: Page): Promise<void> => {
  await page.getByRole("searchbox", { name: ordersMessages.filters.search }).fill(TEST_ORDER_BUYER.email)
  await expect(rowsOf(page)).toHaveCount(TEST_BUYER_ORDERS.length)
}

const openFilter = async (page: Page, column: string): Promise<Locator> => {
  await page.getByRole("button", { name: new RegExp(`^${gridFilters.filter}`, "u") }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByRole("option", { name: new RegExp(`^${column}`, "u") }).click()
  return dialog
}

const closeFilter = async (page: Page): Promise<void> => {
  await page.keyboard.press("Escape")
  await expect(page.getByRole("dialog")).toHaveCount(0)
}

const chooseFilter = async (page: Page, column: string, option: string): Promise<void> => {
  const dialog = await openFilter(page, column)
  await dialog.getByRole("option", { exact: true, name: option }).click()
  await closeFilter(page)
}

const removeFilter = async (page: Page, column: string): Promise<void> => {
  await page.getByRole("button", { name: gridFilters.remove.replace("{column}", column) }).click()
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

  const rows = rowsOf(page)
  await searchForBuyer(page)
  for (const order of TEST_BUYER_ORDERS) {
    await expect(rows.filter({ hasText: order.id })).toContainText(ordersMessages.status[order.status])
  }

  await chooseFilter(page, headers.status, ordersMessages.status[POLAR_ORDER_STATUS.REFUNDED])
  await expect(rows).toHaveCount(1)
  await expect(rows).toContainText("ord_test-buyer-refunded")
  await removeFilter(page, headers.status)

  await chooseFilter(page, headers.product, TEST_ORDER_PRODUCTS.STARTER.name)
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

  const rows = rowsOf(page)
  await searchForBuyer(page)
  await expect(rows.filter({ hasText: paidOrder.id })).toContainText(TEST_BUYER_SHOWN.discount)
  await expect(rows.filter({ hasText: refundedOrder.id })).toContainText(ordersMessages.table.noDiscount)

  const discounts = await openFilter(page, headers.discount)
  await discounts.getByRole("option", { exact: true, name: ordersMessages.filters.discounts.any }).click()
  await expect(rows).toHaveCount(1)
  await expect(rows).toContainText(paidOrder.id)
  await discounts.getByRole("option", { exact: true, name: ordersMessages.filters.discounts.none }).click()
  await expect(rows).toHaveCount(TEST_BUYER_ORDERS.length - 1)
  await expect(rows.filter({ hasText: paidOrder.id })).toHaveCount(0)
  await discounts.getByRole("option", { exact: true, name: TEST_BUYER_SHOWN.discount }).click()
  await expect(rows).toHaveCount(1)
  await expect(rows).toContainText(paidOrder.id)
  await closeFilter(page)
  await removeFilter(page, headers.discount)

  const countries = await openFilter(page, headers.country)
  await countries.getByRole("option", { exact: true, name: TEST_ORDER_OTHER_COUNTRY.countryName }).click()
  await expect(rows).toHaveCount(1)
  await expect(rows).toContainText(otherCountryOrder.id)
  await expect(rows).toContainText(TEST_ORDER_OTHER_COUNTRY.countryName)
  await countries.getByRole("option", { exact: true, name: TEST_ORDER_OTHER_COUNTRY.countryName }).click()
  await countries.getByRole("option", { exact: true, name: TEST_ORDER_BILLING.countryName }).click()
  await expect(rows).toHaveCount(TEST_BUYER_ORDERS.length - 1)
  await closeFilter(page)

  await page.getByRole("searchbox", { name: ordersMessages.filters.search }).fill("no-such-order")
  await expect(page.getByRole("status").filter({ hasText: gridMessages.empty.filteredTitle })).toBeVisible()
})

test("the admin narrows the buyer's orders by total and day and sorts them by total on the server", async ({ appPage, authPage, page }) => {
  await signInAsAdmin({ appPage, authPage, page })
  await page.goto(ROUTES.ADMIN_ORDERS)
  await appPage.waitForAppReady()

  const rows = rowsOf(page)
  await searchForBuyer(page)

  const totals = await openFilter(page, headers.totalAmount)
  await totals.getByRole("textbox", { name: gridFilters.range.min }).fill("100")
  await totals.getByRole("textbox", { name: gridFilters.range.max }).fill("200")
  await totals.getByRole("textbox", { name: gridFilters.range.max }).press("Tab")
  await expect(rows).toHaveCount(1)
  await expect(rows).toContainText(paidOrder.id)
  await closeFilter(page)
  await removeFilter(page, headers.totalAmount)

  await (await openFilter(page, headers.placedAt)).getByRole("button", { name: gridFilters.date.last30Days }).click()
  await expect(rows).toHaveCount(TEST_BUYER_ORDERS.length - 1)
  await expect(rows.filter({ hasText: otherCountryOrder.id })).toHaveCount(0)
  await closeFilter(page)
  await page.getByRole("button", { name: gridFilters.clearAll }).click()
  await expect(rows).toHaveCount(TEST_BUYER_ORDERS.length)

  await page.getByRole("button", { exact: true, name: headers.totalAmount }).click()
  await expect(page.getByRole("columnheader", { name: new RegExp(`^${headers.totalAmount}`, "u") })).toHaveAttribute("aria-sort", "descending")
  await expect(rows.first()).toContainText(otherCountryOrder.id)
  await expect(rows.last()).toContainText(paidOrder.id)
})

test("the admin hides, shows, pins and moves columns, keeps the layout after a reload and resets it", async ({ appPage, authPage, page }) => {
  await signInAsAdmin({ appPage, authPage, page })
  await page.goto(ROUTES.ADMIN_ORDERS)
  await appPage.waitForAppReady()

  const headerNames = page.getByRole("table", { name: ordersMessages.title }).getByRole("columnheader")
  const defaults = ["", headers.placedAt, headers.customer, headers.product, headers.totalAmount, headers.discount, headers.country, headers.status]
  await expect(headerNames).toHaveText(defaults)

  await page.getByRole("button", { name: gridMessages.toolbar.columns }).click()
  await page.getByRole("menuitemcheckbox", { name: headers.discount }).click()
  await page.getByRole("menuitemcheckbox", { name: headers.refundedAmount }).click()
  await page.keyboard.press("Escape")

  await page.getByRole("button", { name: `${headers.status} column options` }).click()
  await page.getByRole("menuitem", { name: gridMessages.column.moveStart }).click()
  await page.getByRole("button", { name: `${headers.customer} column options` }).click()
  await page.getByRole("menuitem", { name: gridMessages.column.pinStart }).click()

  const arranged = ["", headers.placedAt, headers.customer, headers.product, headers.totalAmount, headers.refundedAmount, headers.status, headers.country]
  await expect(headerNames).toHaveText(arranged)
  await page.reload()
  await appPage.waitForAppReady()
  await expect(headerNames).toHaveText(arranged)
  await expect(page.getByRole("columnheader", { name: new RegExp(`^${headers.customer}`, "u") })).toHaveCSS("position", "sticky")

  await page.getByRole("button", { name: gridMessages.toolbar.reset }).click()
  await expect(headerNames).toHaveText(defaults)
  await expect(page.getByRole("button", { name: gridMessages.toolbar.reset })).toBeDisabled()
})

test("the admin exports the orders the search finds to a CSV with the visible columns", async ({ appPage, authPage, page }) => {
  await signInAsAdmin({ appPage, authPage, page })
  await page.goto(ROUTES.ADMIN_ORDERS)
  await appPage.waitForAppReady()
  await searchForBuyer(page)

  const downloading = page.waitForEvent("download")
  await page.getByRole("button", { name: gridMessages.toolbar.export }).click()
  const download = await downloading
  const lines = (await readFile(await download.path(), "utf8")).replace(/^\uFEFF/u, "").trim().split("\r\n")

  expect(download.suggestedFilename()).toMatch(/^orders-\d{4}-\d{2}-\d{2}\.csv$/u)
  expect(lines[0]).toBe([headers.placedAt, headers.customer, headers.product, headers.totalAmount, headers.discount, headers.country, headers.status].join(","))
  expect(lines).toHaveLength(TEST_BUYER_ORDERS.length + 1)
  expect(lines[1]).toContain(`${TEST_ORDER_BUYER.name} <${TEST_ORDER_BUYER.email}>,${TEST_ORDER_PRODUCTS.STARTER.name},149.00 USD,${TEST_BUYER_SHOWN.discount},${TEST_ORDER_BILLING.country},${ordersMessages.status.paid}`)
})

test("the admin filters, hides a column, resizes one and selects a row from the keyboard", async ({ appPage, authPage, page }) => {
  await signInAsAdmin({ appPage, authPage, page })
  await page.goto(ROUTES.ADMIN_ORDERS)
  await appPage.waitForAppReady()
  await searchForBuyer(page)
  const rows = rowsOf(page)

  await page.getByRole("button", { name: gridFilters.filter }).focus()
  await page.keyboard.press("Enter")
  await expect(page.getByRole("dialog").getByRole("option").first()).toBeFocused()
  await page.keyboard.type(headers.status)
  await page.keyboard.press("Enter")
  await expect(page.getByRole("dialog").getByRole("heading", { name: gridFilters.title.replace("{column}", headers.status) })).toBeVisible()
  await page.keyboard.press("ArrowDown")
  await page.keyboard.press("ArrowDown")
  await page.keyboard.press("Space")
  await expect(rows).toHaveCount(1)
  await expect(rows).toContainText(paidOrder.id)
  await page.keyboard.press("Escape")
  await expect(page.getByRole("group", { name: headers.status })).toBeVisible()

  await page.getByRole("button", { name: `${headers.discount} column options` }).focus()
  await page.keyboard.press("Enter")
  await page.keyboard.type(gridMessages.column.hide)
  await page.keyboard.press("Enter")
  await expect(page.getByRole("columnheader", { name: new RegExp(`^${headers.discount}`, "u") })).toHaveCount(0)

  const resizer = page.getByRole("separator", { name: gridMessages.column.resize.replace("{column}", headers.customer) })
  const width = Number(await resizer.getAttribute("aria-valuenow"))
  await resizer.focus()
  await page.keyboard.press("ArrowRight")
  await page.keyboard.press("ArrowRight")
  await expect(resizer).toHaveAttribute("aria-valuenow", String(width + 32))

  await rows.first().getByRole("checkbox").focus()
  await page.keyboard.press("Space")
  const selection = page.getByRole("region", { name: gridMessages.selection.region })
  await expect(selection).toContainText("1 row selected")
  await selection.getByRole("button", { name: gridMessages.selection.clear }).focus()
  await page.keyboard.press("Enter")
  await expect(selection).toHaveCount(0)
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
