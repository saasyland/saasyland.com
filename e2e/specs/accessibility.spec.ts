import type { Page } from "@playwright/test"

import { ROLE_CODES } from "../../src/integrations/better-auth/auth.access"
import { LICENSE_TIER } from "../../src/modules/license/license.constants"
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
  "/docs/architecture/delivery-layer",
  "/docs/conventions",
  "/docs/conventions/accessibility",
  "/docs/conventions/code-style",
  "/docs/conventions/components",
  "/docs/conventions/data-fetching",
  "/docs/conventions/dependencies",
  "/docs/conventions/files-and-naming",
  "/docs/conventions/forms-and-tables",
  "/docs/conventions/git-workflow",
  "/docs/conventions/modules",
  "/docs/conventions/performance",
  "/docs/conventions/routes",
  "/docs/conventions/server-functions",
  "/docs/conventions/testing",
  "/docs/conventions/translations",
  "/docs/features/email",
  "/docs/getting-started/prerequisites",
  "/docs/guides/security-checklist",
  "/docs/integrations/tanstack-table",
  "/docs/project/changelog",
  "/docs/reference/routes",
  "/docs/tooling/playwright",
  "/docs/ui/data-table",
  "/blog",
  "/blog/ai-coding-agents-repository-readiness",
  "/courses",
  "/courses/the-walkthrough",
  "/courses/the-walkthrough/billing-and-webhooks",
  "/privacy",
  "/terms",
  "/refunds",
  "/licence",
  "/affiliates",
  "/auth/sign-in",
  "/auth/sign-up",
  "/auth/forgot-password",
]

const WORKSPACE_PAGES = {
  [ROLE_CODES.ADMIN]: [
    "/admin",
    "/admin/analytics",
    "/admin/payments",
    "/admin/pricing-models",
    "/admin/users/all",
    "/admin/users/invitations",
    "/admin/users/roles",
    "/admin/users/security",
    "/admin/products",
    "/admin/products/create",
    "/admin/courses",
    "/admin/courses/create",
    `/admin/courses/${TEST_COURSE.id}`,
    "/admin/videos",
    "/admin/blog",
    "/admin/blog/create",
    "/admin/landing-page",
    "/admin/settings",
  ],
  [ROLE_CODES.CUSTOMER]: [
    "/app",
    "/app/license",
    "/app/settings",
    `/app?tier=${LICENSE_TIER.COMPLETE}`,
    `/app/license?tier=${LICENSE_TIER.CORE}`,
    `/app?checkoutId=${CHECKOUT_ID}`,
  ],
} as const

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
