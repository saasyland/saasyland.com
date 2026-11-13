import type { Page } from "@playwright/test"

import { TEST_ACCOUNTS, TEST_PASSWORD } from "../data/accounts"
import { TEST_COURSE } from "../data/courses"
import { COLOR_SCHEMES, accessibilityViolations } from "../fixtures/accessibility"
import { expect, test } from "../fixtures/test"
import { APP_NAVIGATION_WAIT_UNTIL, BasePage } from "../pages/base-page"

const CHECKOUT_ID = "4b1f1a63-6d4e-4c3f-9d8e-2f6a0b7c9d10"

const PUBLIC_PAGES = [
  "/",
  "/pl-PL",
  "/docs",
  "/docs/getting-started/prerequisites",
  "/blog",
  "/courses",
  "/courses/the-walkthrough",
  "/courses/the-walkthrough/billing-and-webhooks",
  "/privacy",
  "/terms",
  "/refunds",
  "/licence",
  "/auth/sign-in",
  "/auth/sign-up",
  "/auth/forgot-password",
]

const WORKSPACE_PAGES = {
  admin: [
    "/admin",
    "/admin/users/all",
    "/admin/products",
    "/admin/courses",
    "/admin/courses/create",
    `/admin/courses/${TEST_COURSE.id}`,
    "/admin/videos",
    "/admin/settings",
  ],
  customer: ["/app", "/app/license", "/app?tier=complete", "/app/license?tier=core", `/app?checkoutId=${CHECKOUT_ID}`],
} as const

const visit = async (page: Page, path: string): Promise<void> => {
  await page.goto(path, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
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

test("a blog post meets WCAG 2.2 AA", async ({ page }) => {
  await visit(page, "/blog")
  const firstPost = page.getByRole("main").getByRole("link").filter({ hasText: /\S/u }).first()
  await firstPost.click()
  await expect(page).toHaveURL(/\/blog\/.+/u)
  await new BasePage(page).waitForAppReady()

  expect(await accessibilityViolations(page)).toEqual([])
})

for (const account of TEST_ACCOUNTS) {
  for (const colorScheme of COLOR_SCHEMES) {
    test(`${account.role} workspace pages meet WCAG 2.2 AA in the ${colorScheme} theme`, async ({ authPage, page }) => {
      await page.setExtraHTTPHeaders({ "CF-Connecting-IP": `2001:db8:${crypto.randomUUID().slice(0, 4)}::` })
      await page.emulateMedia({ colorScheme })
      await authPage.gotoSignIn()
      await authPage.emailField().fill(account.email)
      await authPage.passwordField().fill(TEST_PASSWORD)
      await authPage.signInSubmitButton().click()
      await expect(authPage.signInSubmitButton()).toHaveCount(0)

      const violations: Record<string, string[]> = {}
      for (const path of WORKSPACE_PAGES[account.role]) {
        await visit(page, path)
        violations[path] = await accessibilityViolations(page)
      }

      expect(violations).toEqual(Object.fromEntries(WORKSPACE_PAGES[account.role].map((path) => [path, []])))
    })
  }
}
