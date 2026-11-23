import type { Locator, Page } from "@playwright/test"

import * as ROUTES from "../../src/routes"
import { TEST_ACCOUNTS } from "../data/accounts"
import { expect, test } from "../fixtures/auth"

const [admin] = TEST_ACCOUNTS

const RING = { "outline-style": "solid", "outline-width": "2px" } as const

const focusWithKeyboard = async (page: Page, target: Locator): Promise<void> => {
  await target.focus()
  await page.keyboard.press("Shift+Tab")
  await page.keyboard.press("Tab")
  await expect(target).toBeFocused()
}

const expectRing = async (target: Locator): Promise<void> => {
  for (const [property, value] of Object.entries(RING)) {
    await expect(target).toHaveCSS(property, value)
  }
}

test("the footer language switcher, a plain element, draws its ring for the keyboard", async ({ appPage, page }) => {
  await page.goto(ROUTES.LICENCE)
  await appPage.waitForAppReady()
  const summary = page.getByRole("contentinfo").locator("summary")

  await focusWithKeyboard(page, summary)

  await expectRing(summary)
})

test("the admin command palette trigger, a React Aria button, draws its ring for the keyboard", async ({ appPage, authPage, page }) => {
  await authPage.signIn(admin.email)
  await expect(page).toHaveURL(/\/admin\/?$/u)
  await appPage.waitForAppReady()
  const trigger = page.getByRole("button", { name: /^Search the console/u })

  await focusWithKeyboard(page, trigger)

  await expect(trigger).toHaveAttribute("data-focus-visible", "true")
  await expectRing(trigger)
})
