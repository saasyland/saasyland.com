import AxeBuilder from "@axe-core/playwright"
import type { Page } from "@playwright/test"

import { TEST_ACCOUNTS, TEST_PASSWORD } from "../data/accounts"
import { TEST_COURSE } from "../data/courses"
import { expect, test } from "../fixtures/test"
import { APP_NAVIGATION_WAIT_UNTIL, BasePage } from "../pages/base-page"

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"]
const COLOR_SCHEMES = ["light", "dark"] as const

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
  "/affiliates",
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
  customer: ["/app", "/app/license"],
} as const

const revealWholePage = async (page: Page): Promise<void> => {
  await page.evaluate(async () => {
    const nextFrame = async (): Promise<void> => {
      await new Promise((resolve) => requestAnimationFrame(resolve))
      await new Promise((resolve) => requestAnimationFrame(resolve))
    }
    for (let top = 0; top < document.documentElement.scrollHeight; top += window.innerHeight / 2) {
      window.scrollTo({ behavior: "instant", top })
      await nextFrame()
    }
    window.scrollTo({ behavior: "instant", top: document.documentElement.scrollHeight })
    await nextFrame()
  })
}

const accessibilityViolations = async (page: Page): Promise<string[]> => {
  await revealWholePage(page)
  await page.evaluate(async () => {
    const timedAnimations = document
      .getAnimations()
      .filter((animation) => animation.timeline === document.timeline && animation.effect?.getComputedTiming().iterations !== Infinity)
    await Promise.allSettled(timedAnimations.map(async (animation) => animation.finished))
  })
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()

  return violations.map(
    ({ help, id, impact, nodes }) => `${id} (${impact ?? "unknown"}): ${help} at ${nodes.map(({ target }) => target.join(" ")).join(", ")}`,
  )
}

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
