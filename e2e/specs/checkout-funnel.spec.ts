import type { APIRequestContext, Page } from "@playwright/test"
import * as zod from "zod"

import { TEST_ACCOUNTS, TEST_PASSWORD } from "../data/accounts"
import { TEST_CHECKOUT_ID } from "../data/licenses"
import { COLOR_SCHEMES, accessibilityViolations } from "../fixtures/accessibility"
import { expect, test } from "../fixtures/auth"
import { expectPurchaseConfirmation, expectVerificationEmail } from "../fixtures/emails"
import { consentAndPay, consentDialog, deliverPaidOrder } from "../fixtures/license"
import type { AuthPage } from "../pages"
import { APP_NAVIGATION_WAIT_UNTIL } from "../pages/base-page"

import { HTTP_STATUS } from "../../src/modules/_core/constants/api"
import { LICENSE_TIER } from "../../src/modules/license/license.constants"
import { ROUTES } from "../../src/routes"
import { TEST_COURSE, TEST_LESSONS } from "../data/courses"
import { CONTACT_EMAIL } from "../../src/presentation/branding"

const [, customer] = TEST_ACCOUNTS
const [, , paid] = TEST_LESSONS
const SIGN_UP_PASSWORD = "StrongPassword123!"
const BROWSER_CLOCK_BEHIND_MS = 300_000

const sessionSchema = zod.object({ user: zod.object({ id: zod.string() }) })

const useOwnRateLimit = async (page: Page): Promise<string> => {
  const id = crypto.randomUUID()
  await page.setExtraHTTPHeaders({ "CF-Connecting-IP": `2001:db8:${id.slice(0, 4)}::` })
  return id
}

const signUp = async ({ authPage, page }: { authPage: AuthPage; page: Page }) => {
  const id = await useOwnRateLimit(page)
  const email = `buyer.${id}@example.test`
  await authPage.nameField().fill("Test Buyer")
  await authPage.emailField().fill(email)
  await authPage.signUpPasswordField().fill(SIGN_UP_PASSWORD)
  await authPage.signUpSubmitButton().click()
  await expect(page).not.toHaveURL(/\/auth\//u)

  const session = sessionSchema.parse(await (await page.request.get("/api/auth/get-session")).json())
  return { email, userId: session.user.id }
}

const signUpAndVerify = async ({ authPage, page, request }: { authPage: AuthPage; page: Page; request: APIRequestContext }) => {
  const account = await signUp({ authPage, page })
  await page.goto((await expectVerificationEmail(request, account.email)).toString(), { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  return account
}

test.describe("checkout funnel", () => {
  for (const account of TEST_ACCOUNTS) {
    test(`a signed-in ${account.role} who picks a tier on the landing page skips sign-in and opens the offer`, async ({
      appPage,
      authPage,
      landingPage,
      page,
    }) => {
      const errors: string[] = []
      page.on("pageerror", (error) => errors.push(error.message))
      await authPage.signIn(account.email)
      await expect(page).toHaveURL(/\/(?:admin|app)$/u)

      await landingPage.goto()
      await page.locator("#pricing").getByRole("link", { name: "Get Core", exact: true }).click()

      await expect(page).toHaveURL(`/app?tier=${LICENSE_TIER.CORE}`)
      await appPage.waitForAppReady()
      await expect(page.locator("#sign-in-form, #sign-up-form")).toHaveCount(0)
      expect(errors).toEqual([])
    })
  }

  test("a tier picked on the landing page goes from sign-up straight to checkout, and the key, invoices and paid lessons wait for the confirmed email", async ({
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

    const { email, userId } = await signUp({ authPage, page })

    await expect(page).toHaveURL(`/app?tier=${LICENSE_TIER.COMPLETE}`)
    await appPage.waitForAppReady()
    await expect(page.getByRole("region", { name: "Confirm your email" })).toContainText(email)
    const chosen = page.getByRole("region", { name: "Continue with Complete" })
    await expect(chosen).toBeVisible()

    await chosen.getByRole("button", { name: "Continue to checkout" }).click()
    await consentAndPay(page)

    await expect(page).toHaveURL(/\/app\?checkoutId=[\da-f-]{36}$/u)
    await expect(page.getByRole("heading", { name: "Payment received" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Get Core" })).toHaveCount(0)

    await deliverPaidOrder(request, { tier: LICENSE_TIER.COMPLETE, userId, withdrawalConsent: true })

    await expect(page.getByRole("heading", { name: "Your licence is active" })).toBeVisible()
    await expect(page.getByText("Thank you for buying Complete.")).toBeVisible()
    const confirmation = await expectPurchaseConfirmation(request, email)
    expect(confirmation).toContain("Your SaaSy Land Complete licence")
    expect(confirmation).toContain("so the right of withdrawal does not apply to this order")

    await page.goto("/app/license", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()
    await expect(page.getByRole("heading", { name: "Complete", exact: true })).toBeVisible()
    await expect(page.getByText("Your key appears here once you confirm your email address.", { exact: false })).toBeVisible()
    await expect(page.getByRole("link", { name: "Invoices and receipts" })).toHaveCount(0)
    expect((await page.request.get(ROUTES.API_AUTH_CUSTOMER_PORTAL)).status()).toBe(HTTP_STATUS.FORBIDDEN)
    for (const colorScheme of COLOR_SCHEMES) {
      await page.emulateMedia({ colorScheme })
      expect(await accessibilityViolations(page)).toEqual([])
    }

    await page.goto(`/courses/${TEST_COURSE.slug}/${paid.slug}`, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()
    await expect(page.getByRole("heading", { name: "Confirm your email to watch" })).toBeVisible()
    await expect(page.getByTestId("video-player")).toHaveCount(0)

    const playlist = page.waitForResponse((response) => response.url().endsWith(".m3u8"))
    await page.context().newPage().then(async (inbox) => {
      await inbox.goto((await expectVerificationEmail(request, email)).toString(), { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
      await inbox.close()
    })
    await expect(page.getByRole("heading", { name: "Confirm your email to watch" })).toHaveCount(0, { timeout: 15_000 })
    expect((await playlist).status()).toBe(HTTP_STATUS.OK)

    await page.goto("/app/license", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()
    await expect(page.getByRole("region", { name: "Confirm your email" })).toHaveCount(0)
    await expect(page.getByText("Your key is being issued. Refresh in a moment.", { exact: true })).toBeVisible()
    await expect(page.getByRole("link", { name: "Invoices and receipts" })).toBeVisible()
  })

  test("a paid lesson's offer carries the lesson through sign-up and checkout, and comes back to it once the licence is active", async ({
    appPage,
    authPage,
    page,
    request,
  }) => {
    const lesson = `/courses/${TEST_COURSE.slug}/${paid.slug}`
    await page.goto(lesson, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()
    await expect(page.getByText("Complete · $399 one-time", { exact: true })).toBeVisible()
    await page.getByRole("link", { name: "Get Complete" }).click()
    await authPage.waitForAppReady()

    const { userId } = await signUp({ authPage, page })

    await expect(page).toHaveURL(`/app/license?redirect=${encodeURIComponent(lesson)}&tier=${LICENSE_TIER.COMPLETE}`)
    await appPage.waitForAppReady()
    await page.getByRole("region", { name: "Continue with Complete" }).getByRole("button", { name: "Continue to checkout" }).click()
    await consentAndPay(page)
    await expect(page).toHaveURL((url) => url.pathname === ROUTES.APP && url.searchParams.has("checkoutId") && url.searchParams.get("redirect") === lesson)
    await deliverPaidOrder(request, { tier: LICENSE_TIER.COMPLETE, userId, withdrawalConsent: true })

    await expect(page.getByRole("link", { name: "Continue where you left off" })).toHaveAttribute("href", lesson)
  })

  test("checkout starts only once the buyer ticks the consent to immediate supply, and the dialog says why", async ({
    appPage,
    authPage,
    page,
  }) => {
    await useOwnRateLimit(page)
    await authPage.signIn(customer.email)
    await expect(page).toHaveURL("/app")
    await page.goto("/app/license", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()
    await page.getByRole("button", { name: "Get Core", exact: true }).click()

    const dialog = consentDialog(page)
    await expect(dialog).toBeFocused()
    const box = dialog.getByRole("checkbox", { name: /^I ask SaaSy Land to supply Core immediately/u })
    await expect(box).not.toBeChecked()
    await dialog.getByRole("button", { name: "Continue to payment" }).click()

    await expect(dialog.getByRole("alert")).toHaveText("Tick the box to continue.")
    await expect(box).toHaveAttribute("aria-invalid", "true")
    await expect(page).toHaveURL("/app/license")
    for (const colorScheme of COLOR_SCHEMES) {
      await page.emulateMedia({ colorScheme })
      expect(await accessibilityViolations(page)).toEqual([])
    }

    await page.keyboard.press("Escape")
    await expect(dialog).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Get Core", exact: true })).toBeFocused()
    await expect(page).toHaveURL("/app/license")
  })

  test("a slow activation ends in an honest message with the contact email and checkout reference", async ({ appPage, authPage, page }) => {
    await useOwnRateLimit(page)
    await page.clock.install()
    await authPage.gotoSignIn()
    await authPage.emailField().fill(customer.email)
    await authPage.passwordField().fill(TEST_PASSWORD)
    await authPage.signInSubmitButton().click()
    await expect(page).toHaveURL("/app")

    await page.goto(`/app/license?checkoutId=${TEST_CHECKOUT_ID}`, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()
    const activation = page.getByRole("status").filter({ has: page.getByRole("heading", { name: "Payment received" }) })
    await expect(activation).toBeVisible()
    await expect(page.getByRole("region", { name: "Get your licence" })).toHaveCount(0)
    await appPage.waitForHydration(activation)

    await page.clock.fastForward("01:05")

    await expect(page.getByRole("heading", { name: "Activation is taking longer than usual" })).toBeVisible()
    await expect(page.getByRole("link", { name: CONTACT_EMAIL })).toHaveAttribute("href", `mailto:${CONTACT_EMAIL}`)
    await expect(page.getByText(TEST_CHECKOUT_ID, { exact: true })).toBeVisible()
    await expect(page.getByRole("button", { name: "Check again" })).toBeEnabled()
    for (const colorScheme of COLOR_SCHEMES) {
      await page.emulateMedia({ colorScheme })
      expect(await accessibilityViolations(page)).toEqual([])
    }
  })

  test("a browser clock five minutes behind the server hydrates the activation the server rendered", async ({ appPage, authPage, page }) => {
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    await page.clock.setSystemTime(Date.now() - BROWSER_CLOCK_BEHIND_MS)
    await authPage.signIn(customer.email)
    await expect(page).toHaveURL("/app")

    await page.goto(`/app/license?checkoutId=${TEST_CHECKOUT_ID}`, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()
    const activation = page.getByRole("status").filter({ has: page.getByRole("heading", { level: 2 }) })
    await appPage.waitForHydration(activation)

    await expect(activation.getByRole("heading", { level: 2 })).toHaveText("Payment received")
    expect(errors).toEqual([])
  })

  test("a page left open after buying refuses a second checkout and shows the license instead", async ({
    appPage,
    authPage,
    landingPage,
    page,
    request,
  }) => {
    await authPage.gotoSignUp()
    const { userId } = await signUpAndVerify({ authPage, page, request })
    await expect(page).toHaveURL("/app")
    await page.goto("/app/license", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()
    await expect(page.getByRole("button", { name: "Get Agency", exact: true })).toBeEnabled()

    await deliverPaidOrder(request, { tier: LICENSE_TIER.CORE, userId })
    await page.getByRole("button", { name: "Get Agency", exact: true }).click()
    await consentAndPay(page)

    await expect(page.getByText("You already have an active licence. To move to another tier, email hello@saasyland.com.")).toBeVisible()
    await expect(page.getByRole("heading", { name: "Core", exact: true })).toBeVisible()
    await expect(page.getByRole("region", { name: "Get your licence" })).toHaveCount(0)

    await landingPage.goto()
    await page.locator("#pricing").getByRole("link", { name: "Get Complete", exact: true }).click()
    await expect(page).toHaveURL(`/app?tier=${LICENSE_TIER.COMPLETE}`)
    await appPage.waitForAppReady()
    await expect(page.getByRole("heading", { name: "Your licence", exact: true })).toBeVisible()
    await expect(page.getByRole("button", { name: "Continue to checkout" })).toHaveCount(0)
  })
})
