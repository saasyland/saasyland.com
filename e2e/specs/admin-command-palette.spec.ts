import type { Page } from "@playwright/test"

import { TEST_ACCOUNTS } from "../data/accounts"
import { TEST_BUYER_ORDERS, TEST_ORDER_BUYER } from "../data/payments"
import { expect, test } from "../fixtures/auth"
import { AuthPage } from "../pages"
import { BasePage } from "../pages/base-page"
import authNavigation from "../../messages/en-US/navigation.auth.json" with { type: "json" }
import coursesNavigation from "../../messages/en-US/navigation.courses.json" with { type: "json" }
import paymentsNavigation from "../../messages/en-US/navigation.payments.json" with { type: "json" }
import labels from "../../messages/en-US/pages.admin.json" with { type: "json" }

const [admin] = TEST_ACCOUNTS
const [paidOrder] = TEST_BUYER_ORDERS
const copy = labels.components.commandPalette

const signInAsAdmin = async (page: Page): Promise<void> => {
  await new AuthPage(page).signIn(admin.email)
  await expect(page).toHaveURL(/\/admin\/?$/u)
  await new BasePage(page).waitForAppReady()
}

const openPalette = async (page: Page) => {
  await page.keyboard.press("ControlOrMeta+k")
  const palette = page.getByRole("dialog", { name: copy.title })
  await expect(palette.getByRole("searchbox", { name: copy.placeholder })).toBeFocused()
  return palette
}

test("an administrator finds a user by email and an order by its ID from the command palette and opens each", async ({ page }) => {
  await signInAsAdmin(page)

  const palette = await openPalette(page)
  await page.keyboard.type(TEST_ORDER_BUYER.email)
  const users = palette.getByRole("group", { name: authNavigation.search.users })
  const buyer = users.getByRole("menuitem", { name: new RegExp(TEST_ORDER_BUYER.name, "u") })
  await expect(buyer).toContainText(TEST_ORDER_BUYER.email)
  await expect(palette.getByRole("group", { name: paymentsNavigation.search.orders }).getByRole("menuitem")).not.toHaveCount(0)
  await buyer.click()
  await expect(page).toHaveURL(new RegExp(`/admin/users/${TEST_ORDER_BUYER.id}$`, "u"))
  await expect(page.getByRole("heading", { level: 2, name: TEST_ORDER_BUYER.name })).toBeVisible()
  await expect(palette).toBeHidden()

  const reopened = await openPalette(page)
  await expect(reopened.getByRole("group", { name: copy.groups.recent }).getByRole("menuitem").first()).toContainText(
    TEST_ORDER_BUYER.name,
  )
  await page.keyboard.type(paidOrder.id)
  const order = reopened.getByRole("group", { name: paymentsNavigation.search.orders }).getByRole("menuitem")
  await expect(order).toHaveCount(1)
  await expect(order).toContainText(paidOrder.id)
  await page.keyboard.press("ArrowDown")
  await page.keyboard.press("Enter")
  await expect(page).toHaveURL(new RegExp(`/admin/orders/${paidOrder.id}$`, "u"))
  await expect(page.getByText(paidOrder.id, { exact: true })).toBeVisible()
  await expect(reopened).toBeHidden()

  await openPalette(page)
  await page.keyboard.press("Escape")
  await expect(page.getByRole("dialog", { name: copy.title })).toBeHidden()
})

const REOPEN_DELAYS_MS = [0, 50, 100, 150] as const
const DESTINATIONS = [
  { label: coursesNavigation.admin.courses, path: /\/admin\/courses$/u },
  { label: paymentsNavigation.admin.orders, path: /\/admin\/orders$/u },
] as const

test("the command palette opens fresh however soon the shortcut follows a result it opened", async ({ page }) => {
  await signInAsAdmin(page)

  for (const [index, delay] of REOPEN_DELAYS_MS.entries()) {
    const destination = DESTINATIONS[index % DESTINATIONS.length] ?? DESTINATIONS[0]
    const palette = await openPalette(page)
    await page.keyboard.type(destination.label)
    await expect(palette.getByRole("group", { name: copy.groups.pages }).getByRole("menuitem")).toHaveCount(1)
    await page.keyboard.press("Enter")
    await page.waitForTimeout(delay)

    const reopened = await openPalette(page)
    await expect(reopened.getByRole("searchbox", { name: copy.placeholder }), `${String(delay)} ms`).toHaveValue("")
    await expect(reopened.getByRole("group", { name: copy.groups.recent }).getByRole("menuitem").first()).toContainText(destination.label)
    await expect(page).toHaveURL(destination.path)
    await page.keyboard.press("Escape")
    await expect(reopened).toBeHidden()
  }
})
