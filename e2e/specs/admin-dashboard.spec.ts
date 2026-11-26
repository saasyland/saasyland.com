import { setTimeout as delay } from "node:timers/promises"

import type { Locator, Page } from "@playwright/test"

import { ROLE_CODES } from "../../src/integrations/better-auth/auth.roles"
import { HTTP_STATUS } from "../../src/modules/_core/constants/api"
import * as ROUTES from "../../src/routes"
import {
  LICENSE_STATUS,
  LICENSE_STATUSES,
  LICENSE_TIERS,
  type LicenseStatus,
  type LicenseTier,
} from "../../src/modules/license/license.constants"
import { TEST_ACCOUNTS } from "../data/accounts"
import { TEST_LICENSES, TEST_MACHINES_LICENSE, TEST_TIER_LICENSES } from "../data/licenses"
import { TEST_REVENUE } from "../data/payments"
import { expect, test } from "../fixtures/auth"
import { filterByOption, gridOf, hideColumn, removeFilter, resetLayout, sortBy } from "../fixtures/data-grid"
import { AuthPage } from "../pages"
import { APP_NAVIGATION_WAIT_UNTIL, BasePage } from "../pages/base-page"
import pricingMessages from "../../messages/en-US/components.custom.pricing.json" with { type: "json" }
import authDashboardMessages from "../../messages/en-US/dashboard.auth.json" with { type: "json" }
import coursesDashboardMessages from "../../messages/en-US/dashboard.courses.json" with { type: "json" }
import licenseDashboardMessages from "../../messages/en-US/dashboard.license.json" with { type: "json" }
import paymentsDashboardMessages from "../../messages/en-US/dashboard.payments.json" with { type: "json" }
import notFoundMessages from "../../messages/en-US/errors.not-found.json" with { type: "json" }
import pagesAdminDashboardMessages from "../../messages/en-US/pages.admin.dashboard.json" with { type: "json" }
import pagesAdminMessages from "../../messages/en-US/pages.admin.json" with { type: "json" }
import pagesAdminSidebarMessages from "../../messages/en-US/pages.admin.sidebar.json" with { type: "json" }
import navigationPaymentsMessages from "../../messages/en-US/navigation.payments.json" with { type: "json" }
import navigationProductsMessages from "../../messages/en-US/navigation.products.json" with { type: "json" }
import sidebarMessages from "../../messages/en-US/components.shadcn.sidebar.json" with { type: "json" }

const [admin, customer] = TEST_ACCOUNTS

const REMOVED_SCREENS = [
  "/admin/analytics",
  "/admin/blog",
  "/admin/blog/create",
  "/admin/landing-page",
  "/admin/payments",
  "/admin/pricing-models",
  "/admin/products/create",
  "/admin/users/roles",
] as const

const REMOVED_LABELS = /analytics|pricing models|payments|blog|landing page|roles/iu

const CLIENT_SCRIPT = /\/assets\/[\w.-]+\.js$/u

const SCRIPT_LATENCY_MS = 400

const REACT_FIBER_KEY_PREFIX = "__reactFiber$"

const revenue = paymentsDashboardMessages.revenue
const ranges = pagesAdminDashboardMessages.chart.range
const licenses = licenseDashboardMessages.licenses

const SEEDED_LICENSES = [...TEST_LICENSES, ...TEST_TIER_LICENSES, TEST_MACHINES_LICENSE]

const STATUSES_PURCHASES_ADD_TO = [LICENSE_STATUS.ACTIVE, LICENSE_STATUS.REFUNDED] as const

const panel = (page: Page, title: string): Locator =>
  page.locator("[data-slot=card], section").filter({ has: page.getByRole("heading", { level: 2, name: title }) })

const figure = (scope: Locator, name: string): Locator => scope.getByText(name, { exact: true }).locator("xpath=following-sibling::dd")

const seeded = (tier: LicenseTier, status: LicenseStatus): number =>
  SEEDED_LICENSES.filter((license) => license.tier === tier && license.status === status).length

const countIn = async (cell: Locator): Promise<number> => Number((await cell.innerText()).replaceAll(/\D/gu, ""))

const signInAsAdmin = async (page: Page): Promise<void> => {
  await new AuthPage(page).signIn(admin.email)
  await expect(page).toHaveURL(/\/admin\/?$/u)
  await new BasePage(page).waitForAppReady()
}

test("the dashboard totals the seeded orders per currency, refunds subtracted, and follows the period", async ({ page }) => {
  await signInAsAdmin(page)

  const revenuePanel = panel(page, revenue.title)
  await expect(revenuePanel.getByRole("radio", { name: ranges["30d"] })).toBeChecked()
  await revenuePanel.getByRole("tab", { exact: true, name: "GBP" }).click()
  await expect(figure(revenuePanel, revenue.net)).toHaveText(TEST_REVENUE.last30Days.net)
  await expect(figure(revenuePanel, revenue.orders)).toHaveText(TEST_REVENUE.last30Days.orders)
  await expect(figure(revenuePanel, revenue.refunded)).toHaveText(TEST_REVENUE.last30Days.refunded)
  await expect(revenuePanel.getByRole("tab", { exact: true, name: "EUR" })).toHaveCount(0)

  await revenuePanel.getByRole("radio", { name: ranges["12m"] }).click()
  await expect(revenuePanel.getByRole("radio", { name: ranges["12m"] })).toBeChecked()
  await revenuePanel.getByRole("tab", { exact: true, name: "EUR" }).click()
  await expect(figure(revenuePanel, revenue.net)).toHaveText(TEST_REVENUE.last12MonthsEuro.net)
  await expect(figure(revenuePanel, revenue.orders)).toHaveText(TEST_REVENUE.last12MonthsEuro.orders)
  await expect(revenuePanel.getByRole("table", { name: revenue.series })).toBeAttached()

  const signups = panel(page, authDashboardMessages.signups.title)
  await expect(signups.getByText(/^\d[\d,]* new users?$/u)).toBeVisible()
  await expect(panel(page, coursesDashboardMessages.progress.title).getByRole("table")).toBeVisible()
  await expect(page.getByText("Revenue Overview")).toHaveCount(0)
})

test("a press on a dashboard panel right after a full load hydrates the console takes effect, however late the scripts arrive", async ({
  page,
}) => {
  await signInAsAdmin(page)
  await page.route(CLIENT_SCRIPT, async (route) => {
    await delay(SCRIPT_LATENCY_MS)
    await route.continue()
  })

  await page.goto(ROUTES.ADMIN, { waitUntil: "commit" })
  await page.waitForFunction(
    (prefix) => {
      const sidebar = document.querySelector("[data-slot=sidebar]")

      return sidebar !== null && Object.keys(sidebar).some((key) => key.startsWith(prefix))
    },
    REACT_FIBER_KEY_PREFIX,
    { polling: "raf" },
  )

  const revenuePanel = panel(page, revenue.title)
  await revenuePanel.getByRole("radio", { name: ranges["12m"] }).click()
  await expect(revenuePanel.getByRole("tab", { exact: true, name: "EUR" })).toBeVisible()
})

test("the dashboard counts each tier's licences by status, the seeded revoked ones exactly and the active and refunded ones purchases add to", async ({
  page,
}) => {
  await signInAsAdmin(page)

  const table = panel(page, licenses.title).getByRole("table")
  await expect(table.getByRole("columnheader")).toHaveText([
    licenses.columns.tier,
    ...LICENSE_STATUSES.map((status) => licenses.columns[status]),
  ])
  for (const tier of LICENSE_TIERS) {
    const name = pricingMessages.tiers[tier].name
    const cells = table.getByRole("row").filter({ has: page.getByRole("cell", { exact: true, name }) }).getByRole("cell")
    const cellOf = (status: LicenseStatus): Locator => cells.nth(LICENSE_STATUSES.indexOf(status) + 1)

    await expect(cells).toHaveCount(LICENSE_STATUSES.length + 1)
    await expect(cellOf(LICENSE_STATUS.REVOKED)).toHaveText(String(seeded(tier, LICENSE_STATUS.REVOKED)))
    for (const status of STATUSES_PURCHASES_ADD_TO) {
      expect(await countIn(cellOf(status)), `${name} ${status}`).toBeGreaterThanOrEqual(seeded(tier, status))
    }
  }
})

test("the dashboard counts the accounts and links the newest to their profiles", async ({ page }) => {
  await signInAsAdmin(page)

  const registered = page
    .getByRole("link", { exact: true, name: authDashboardMessages.registeredUsers })
    .locator("xpath=ancestor::dt/following-sibling::dd")
  await expect(registered).toHaveText(/^[1-9][\d,]*$/u)
  const newest = panel(page, pagesAdminDashboardMessages.users.title)
  const profiles = newest.getByRole("table").getByRole("link")
  await expect(profiles).not.toHaveCount(0)
  for (const profile of await profiles.all()) {
    await expect(profile).toHaveAttribute("href", /^\/admin\/users\/[^/]+$/u)
  }
})

test("the admin menu and the command palette list only working screens", async ({ page }) => {
  await signInAsAdmin(page)

  const sidebar = page.getByRole("navigation", { name: pagesAdminSidebarMessages.navigationLabel })
  const sections = await sidebar.getByRole("link").allTextContents()
  expect(sections.length).toBeGreaterThan(0)
  expect(sections.filter((section) => REMOVED_LABELS.test(section))).toStrictEqual([])

  await page.keyboard.press("ControlOrMeta+k")
  const pages = page.getByRole("dialog").getByRole("group", { name: pagesAdminMessages.components.commandPalette.groups.pages })
  await expect(pages.getByRole("menuitem")).toHaveCount(sections.length)
  for (const [index, section] of sections.entries()) {
    await expect(pages.getByRole("menuitem").nth(index)).toHaveAccessibleName(new RegExp(`^${section}`, "u"))
  }
})

test("the admin menu files orders under Sales and keeps only the products under Offerings, on a desktop and a phone", async ({
  page,
}, testInfo) => {
  const { groups } = pagesAdminSidebarMessages
  await page.setViewportSize({ height: 800, width: 1280 })
  await signInAsAdmin(page)

  const sidebar = page.getByRole("navigation", { name: pagesAdminSidebarMessages.navigationLabel })
  await expect(sidebar.getByRole("group", { exact: true, name: groups.offerings }).getByRole("link")).toHaveText([
    navigationProductsMessages.admin.products,
  ])
  const sales = sidebar.getByRole("group", { exact: true, name: groups.sales })
  await expect(sales.getByRole("link")).toHaveText([navigationPaymentsMessages.admin.orders])
  await sales.getByRole("link", { exact: true, name: navigationPaymentsMessages.admin.orders }).click()
  await expect(page).toHaveURL(/\/admin\/orders$/u)
  await expect(sales.getByRole("link", { exact: true, name: navigationPaymentsMessages.admin.orders })).toHaveAttribute("aria-current", "page")
  await page.screenshot({ animations: "disabled", path: testInfo.outputPath("admin-sidebar-1280.png") })

  await page.setViewportSize({ height: 844, width: 390 })
  await page.getByRole("button", { exact: true, name: sidebarMessages.toggle }).click()
  const sheet = page.getByRole("dialog", { exact: true, name: sidebarMessages.title })
  await expect(sheet).toBeInViewport({ ratio: 1 })
  await expect(sheet.getByRole("group", { exact: true, name: groups.sales }).getByRole("link")).toHaveText([
    navigationPaymentsMessages.admin.orders,
  ])
  await page.screenshot({ animations: "disabled", path: testInfo.outputPath("admin-sidebar-390.png") })
})

for (const path of REMOVED_SCREENS) {
  test(`${path} is gone and answers 404 to an admin`, async ({ page }) => {
    await signInAsAdmin(page)

    const response = await page.goto(path, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await new BasePage(page).waitForAppReady()

    expect(response?.status()).toBe(HTTP_STATUS.NOT_FOUND)
    await expect(page.getByRole("heading", { level: 1, name: notFoundMessages.metadata.title })).toBeVisible()
  })
}

test("a customer is sent to the workspace and never sees the dashboard's figures", async ({ page }) => {
  await new AuthPage(page).signIn(customer.email)
  await expect(page).toHaveURL(/\/app\/?$/u)

  await page.goto("/admin", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await new BasePage(page).waitForAppReady()

  await expect(page).toHaveURL(/\/app\/?$/u)
  await expect(page.getByRole("heading", { name: revenue.title })).toHaveCount(0)
  await expect(page.getByText(TEST_REVENUE.last30Days.net)).toHaveCount(0)
})

test("the admin filters the newest users by status, sorts them by join day, hides a column and keeps it after a reload", async ({ page }) => {
  await signInAsAdmin(page)
  const { columns, status } = pagesAdminDashboardMessages.users.table
  const grid = gridOf(page, pagesAdminDashboardMessages.users.title)
  const headerNames = grid.getByRole("columnheader")

  await filterByOption(grid, columns.status, status.active)
  for (const cell of await grid.locator("tbody tr td:nth-child(4)").all()) {
    await expect(cell).toHaveText(status.active)
  }
  await removeFilter(grid, columns.status)
  await sortBy(grid, columns.joined)
  await expect(grid.getByRole("columnheader", { name: new RegExp(`^${columns.joined}`, "u") })).toHaveAttribute("aria-sort", /ascending|descending/u)

  await hideColumn(grid, columns.role)
  const arranged = ["", columns.user, columns.status, columns.joined]
  await expect(headerNames).toHaveText(arranged)
  await page.reload({ waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await new BasePage(page).waitForAppReady()
  await expect(headerNames).toHaveText(arranged)
  await resetLayout(grid)
  await expect(headerNames).toHaveText(["", columns.user, columns.role, columns.status, columns.joined])
})

test("the admin finds any account from the newest users on the server and reads each role by its name", async ({ page }) => {
  await signInAsAdmin(page)
  const { columns, role } = pagesAdminDashboardMessages.users.table
  const grid = gridOf(page, pagesAdminDashboardMessages.users.title)
  const rows = grid.locator("tbody tr")
  const search = grid.getByRole("searchbox", { name: pagesAdminDashboardMessages.users.search })

  await search.fill(customer.email)
  await expect(rows).toHaveCount(1)
  await expect(rows).toContainText(customer.name)
  await expect(rows.getByText(role.customer, { exact: true })).toBeVisible()

  await search.fill(admin.email)
  await expect(rows).toHaveCount(1)
  await expect(rows.getByText(role.admin, { exact: true })).toBeVisible()
  await expect(rows.getByText(ROLE_CODES.ADMIN, { exact: true })).toHaveCount(0)

  await search.fill("")
  await filterByOption(grid, columns.role, role.admin)
  for (const cell of await grid.locator("tbody tr td:nth-child(3)").all()) {
    await expect(cell).toHaveText(role.admin)
  }
})
