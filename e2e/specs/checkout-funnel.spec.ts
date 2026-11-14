import type { APIRequestContext, Page } from "@playwright/test"
import * as zod from "zod"

import { TEST_ACCOUNTS, TEST_PASSWORD } from "../data/accounts"
import { TEST_LESSONS } from "../data/courses"
import { COLOR_SCHEMES, accessibilityViolations } from "../fixtures/accessibility"
import { expectVerificationEmail } from "../fixtures/emails"
import { deliverPaidOrder } from "../fixtures/polar"
import { expect, test } from "../fixtures/test"
import type { AuthPage } from "../pages"
import { APP_NAVIGATION_WAIT_UNTIL } from "../pages/base-page"

import { LESSON_ACCESS } from "../../src/modules/lesson/lesson.constants"
import { LICENSE_TIER } from "../../src/modules/license/license.constants"
import { CONTACT_EMAIL } from "../../src/presentation/branding"

const [, customer] = TEST_ACCOUNTS
const SIGN_UP_PASSWORD = "StrongPassword123!"
const CHECKOUT_ID = "4b1f1a63-6d4e-4c3f-9d8e-2f6a0b7c9d10"
const PAID_LESSONS = TEST_LESSONS.filter(({ access }) => access === LESSON_ACCESS.PAID).length

const sessionSchema = zod.object({ user: zod.object({ id: zod.string() }) })

const useOwnRateLimit = async (page: Page): Promise<string> => {
  const id = crypto.randomUUID()
  await page.setExtraHTTPHeaders({ "CF-Connecting-IP": `2001:db8:${id.slice(0, 4)}::` })
  return id
}

const signUpAndVerify = async ({ authPage, page, request }: { authPage: AuthPage; page: Page; request: APIRequestContext }) => {
  const id = await useOwnRateLimit(page)
  const email = `buyer.${id}@example.test`
  await authPage.nameField().fill("Test Buyer")
  await authPage.emailField().fill(email)
  await authPage.signUpPasswordField().fill(SIGN_UP_PASSWORD)
  await authPage.confirmPasswordField().fill(SIGN_UP_PASSWORD)
  await authPage.signUpSubmitButton().click()
  await expect(page).toHaveURL(/\/auth\/verify-email\?email=/u)

  await page.goto((await expectVerificationEmail(request, email)).toString(), { waitUntil: APP_NAVIGATION_WAIT_UNTIL })

  const session = sessionSchema.parse(await (await page.request.get("/api/auth/get-session")).json())
  return session.user.id
}

test.describe("checkout funnel", () => {
  test("a tier picked on the landing page survives sign-up, opens checkout in one press and activates", async ({
    appPage,
    authPage,
    landingPage,
    page,
    request,
  }) => {
    await landingPage.goto()
    await page.locator("#pricing").getByRole("link", { name: "Get Complete", exact: true }).click()
    await expect(page).toHaveURL(`/auth/sign-up?redirect=${encodeURIComponent(`/app?tier=${LICENSE_TIER.COMPLETE}`)}`)
    await authPage.waitForAppReady()

    const userId = await signUpAndVerify({ authPage, page, request })

    await expect(page).toHaveURL(`/app?tier=${LICENSE_TIER.COMPLETE}`)
    await appPage.waitForAppReady()
    const chosen = page.getByRole("region", { name: "Continue with Complete" })
    await expect(chosen).toBeVisible()
    await expect(page.getByRole("region", { name: "Courses included with Complete and Agency" })).toContainText(
      `Your account cannot open ${String(PAID_LESSONS)} lessons in 1 course yet.`,
    )

    await chosen.getByRole("button", { name: "Continue to checkout" }).click()

    await expect(page).toHaveURL(/\/app\?checkoutId=[\da-f-]{36}$/u)
    await expect(page.getByRole("heading", { name: "Payment received" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Get Core" })).toHaveCount(0)

    await deliverPaidOrder(request, { tier: LICENSE_TIER.COMPLETE, userId })

    await expect(page.getByRole("heading", { name: "Your license is active" })).toBeVisible()
    await expect(page.getByText("Thank you for buying Complete.")).toBeVisible()

    await page.goto("/app/license", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()
    await expect(page.getByRole("heading", { name: "Complete", exact: true })).toBeVisible()
    for (const colorScheme of COLOR_SCHEMES) {
      await page.emulateMedia({ colorScheme })
      expect(await accessibilityViolations(page)).toEqual([])
    }
  })

  test("a slow activation ends in an honest message with the contact email and checkout reference", async ({ appPage, authPage, page }) => {
    await useOwnRateLimit(page)
    await page.clock.install()
    await authPage.gotoSignIn()
    await authPage.emailField().fill(customer.email)
    await authPage.passwordField().fill(TEST_PASSWORD)
    await authPage.signInSubmitButton().click()
    await expect(page).toHaveURL("/app")

    await page.goto(`/app/license?checkoutId=${CHECKOUT_ID}`, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()
    await expect(page.getByRole("heading", { name: "Payment received" })).toBeVisible()
    await expect(page.getByRole("region", { name: "Get your license" })).toHaveCount(0)

    await page.clock.fastForward("01:05")

    await expect(page.getByRole("heading", { name: "Activation is taking longer than usual" })).toBeVisible()
    await expect(page.getByRole("link", { name: CONTACT_EMAIL })).toHaveAttribute("href", `mailto:${CONTACT_EMAIL}`)
    await expect(page.getByText(CHECKOUT_ID, { exact: true })).toBeVisible()
    await expect(page.getByRole("button", { name: "Check again" })).toBeEnabled()
    for (const colorScheme of COLOR_SCHEMES) {
      await page.emulateMedia({ colorScheme })
      expect(await accessibilityViolations(page)).toEqual([])
    }
  })

  test("a page left open after buying refuses a second checkout and shows the license instead", async ({
    appPage,
    authPage,
    landingPage,
    page,
    request,
  }) => {
    await authPage.gotoSignUp()
    const userId = await signUpAndVerify({ authPage, page, request })
    await expect(page).toHaveURL("/app")
    await page.goto("/app/license", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()
    await expect(page.getByRole("button", { name: "Get Agency", exact: true })).toBeEnabled()

    await deliverPaidOrder(request, { tier: LICENSE_TIER.CORE, userId })
    await page.getByRole("button", { name: "Get Agency", exact: true }).click()

    await expect(page.getByText("You already have an active license. To move to another tier, email hello@saasyland.com.")).toBeVisible()
    await expect(page.getByRole("heading", { name: "Core", exact: true })).toBeVisible()
    await expect(page.getByRole("region", { name: "Get your license" })).toHaveCount(0)

    await landingPage.goto()
    await page.locator("#pricing").getByRole("link", { name: "Get Complete", exact: true }).click()
    await expect(page).toHaveURL(`/app?tier=${LICENSE_TIER.COMPLETE}`)
    await appPage.waitForAppReady()
    await expect(page.getByRole("heading", { name: "Your license", exact: true })).toBeVisible()
    await expect(page.getByRole("button", { name: "Continue to checkout" })).toHaveCount(0)
  })
})
