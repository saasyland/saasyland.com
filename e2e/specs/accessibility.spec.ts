import type { Page } from "@playwright/test"

import { TEST_ACCOUNTS } from "../data/accounts"
import { PUBLIC_PAGES, workspacePages } from "../data/pages"
import { COLOR_SCHEMES, accessibilityViolations } from "../fixtures/accessibility"
import { expect, test } from "../fixtures/test"
import { APP_NAVIGATION_WAIT_UNTIL, BasePage } from "../pages/base-page"

const visit = async (page: Page, path: string): Promise<void> => {
  const response = await page.goto(path, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  expect(response?.ok()).toBe(true)
  await new BasePage(page).waitForAppReady()
}

for (const colorScheme of COLOR_SCHEMES) {
  for (const path of PUBLIC_PAGES) {
    test(`${path} meets WCAG 2.2 AA in the ${colorScheme} theme`, async ({ page }) => {
      await page.emulateMedia({ colorScheme })
      await visit(page, path)

      expect(await accessibilityViolations(page)).toEqual([])
    })
  }
}

for (const account of TEST_ACCOUNTS) {
  for (const colorScheme of COLOR_SCHEMES) {
    test(`${account.role} workspace pages meet WCAG 2.2 AA in the ${colorScheme} theme`, async ({ authPage, page }) => {
      const paths = workspacePages(account.role).map(({ path }) => path)
      await page.emulateMedia({ colorScheme })
      await authPage.signIn(account.email)
      await expect(authPage.signInSubmitButton()).toHaveCount(0)

      const violations: Record<string, string[]> = {}
      for (const path of paths) {
        await visit(page, path)
        violations[path] = await accessibilityViolations(page)
      }

      expect(violations).toEqual(Object.fromEntries(paths.map((path) => [path, []])))
    })
  }
}
