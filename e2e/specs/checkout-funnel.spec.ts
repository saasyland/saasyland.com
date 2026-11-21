import type { APIRequestContext, Page } from "@playwright/test"
import { STACK_DEFAULTS } from "@saasyland/stack"
import { ACTIVATION_KIND, API_ENDPOINT, PLATFORM, apiRequest, deriveMachineId, readApiResponse } from "@saasyland/stack/api"
import * as zod from "zod"

import { TEST_ACCOUNTS, TEST_PASSWORD } from "../data/accounts"
import { TEST_BUNDLE, TEST_CHECKOUT_ID } from "../data/licenses"
import { COLOR_SCHEMES, accessibilityViolations } from "../fixtures/accessibility"
import { expect, test } from "../fixtures/auth"
import { expectPurchaseConfirmation, expectVerificationEmail } from "../fixtures/emails"
import { buyLicense, deliverPaidOrder, startedCheckouts } from "../fixtures/license"
import type { AuthPage } from "../pages"
import { APP_NAVIGATION_WAIT_UNTIL } from "../pages/base-page"

import { HTTP_STATUS, IP_ADDRESS_HEADER } from "../../src/modules/_core/constants/api"
import { LICENSE_CHECKOUT_METADATA, LICENSE_TIER, LICENSE_TIERS } from "../../src/modules/license/license.constants"
import { CLI_INIT_COMMAND, CLI_KEY_LINES, CLI_SETUP_LINES } from "../../src/data/cli"
import { POLAR_CHECKOUT_DEFAULT_LANGUAGE } from "../../src/data/polar"
import { TEST_COURSE, TEST_LESSONS } from "../data/courses"
import { CONTACT_EMAIL } from "../../src/presentation/branding"
import { ROUTES } from "../../src/routes"

const [, customer] = TEST_ACCOUNTS
const [, , paid] = TEST_LESSONS
const SIGN_UP_PASSWORD = "StrongPassword123!"
const BROWSER_CLOCK_BEHIND_MS = 300_000

const sessionSchema = zod.object({ user: zod.object({ id: zod.string() }) })

const COURSE_TIERS: readonly string[] = [LICENSE_TIER.COMPLETE, LICENSE_TIER.AGENCY]

const checklist = (page: Page) => page.getByRole("region", { name: "Get started" })

const stepDone = (page: Page, title: string) => checklist(page).getByRole("listitem").filter({ hasText: title }).getByText("Done")

const fromOwnAddress = (request: Request): Request => {
  request.headers.set(IP_ADDRESS_HEADER, `2001:db8:${crypto.randomUUID().slice(0, 4)}::`)
  return request
}

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

    await expect(chosen.getByText(/^You pay on Polar, our Merchant of Record\./u)).toBeVisible()
    await chosen.getByRole("button", { name: "Continue to checkout" }).click()

    await expect(page).toHaveURL(/\/app\?checkoutId=[\da-f-]{36}$/u)
    await expect(page.getByRole("dialog")).toHaveCount(0)
    await expect(page.getByRole("heading", { name: "Payment received" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Get Core" })).toHaveCount(0)
    const [checkout] = await startedCheckouts(request, userId)
    expect(checkout).toMatchObject({
      custom_field_data: {},
      locale: "en",
      metadata: { [LICENSE_CHECKOUT_METADATA.LOCALE]: "en-US" },
      return_url: new URL(`/app?tier=${LICENSE_TIER.COMPLETE}`, page.url()).href,
    })

    await deliverPaidOrder(request, { tier: LICENSE_TIER.COMPLETE, userId, withdrawalConsent: true })

    await expect(page.getByRole("heading", { name: "Your licence is active" })).toBeVisible()
    await expect(page.getByText("Thank you for buying Complete. These steps take you to your first project.")).toBeVisible()
    await expect(checklist(page)).toBeVisible()
    await expect(checklist(page).getByText("Your key appears here once you confirm your email address.", { exact: false })).toBeVisible()
    await expect(checklist(page).getByRole("button", { name: "Copy licence key" })).toHaveCount(0)
    const confirmation = await expectPurchaseConfirmation(request, email)
    expect(confirmation).toContain("Your SaaSy Land Complete licence")
    expect(confirmation).toContain("so the right of withdrawal does not apply to this order")
    expect(confirmation).toContain("if you have not generated a project with the CLI or opened a paid lesson")
    expect(confirmation).toContain(CLI_INIT_COMMAND)

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
    await expect(page.getByText("Your key is being issued. It appears here by itself in a few seconds.", { exact: true })).toBeVisible()
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
    await expect(page).toHaveURL((url) => url.pathname === ROUTES.APP && url.searchParams.has("checkoutId") && url.searchParams.get("redirect") === lesson)
    await deliverPaidOrder(request, { tier: LICENSE_TIER.COMPLETE, userId, withdrawalConsent: true })

    await expect(page.getByRole("link", { name: "Continue where you left off" })).toHaveAttribute("href", lesson)
  })

  test("opens Polar's checkout without a dialog, in the buyer's language, with a back button and the consent box left for the buyer", async ({
    appPage,
    authPage,
    page,
    request,
  }) => {
    await authPage.gotoSignUp()
    const { userId } = await signUpAndVerify({ authPage, page, request })
    await page.goto(`/pl-PL${ROUTES.APP_LICENSE}`, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()
    for (const colorScheme of COLOR_SCHEMES) {
      await page.emulateMedia({ colorScheme })
      expect(await accessibilityViolations(page)).toEqual([])
    }

    await page.getByRole("button", { name: "Wybierz Podstawę", exact: true }).click()

    await expect(page).toHaveURL(/\/pl-PL\/app\?checkoutId=[\da-f-]{36}$/u)
    const [checkout] = await startedCheckouts(request, userId)
    expect(checkout).toMatchObject({
      custom_field_data: {},
      locale: "pl",
      return_url: new URL(`/pl-PL${ROUTES.APP_LICENSE}`, page.url()).href,
    })

    await page.goto(`/uk-UA${ROUTES.APP_LICENSE}`, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()
    await expect(page.getByText("Сторінка оплати відкриється англійською.", { exact: false })).toBeVisible()
    await page.getByRole("button", { name: "Придбати Core", exact: true }).click()
    await expect(page).toHaveURL(/\/uk-UA\/app\?checkoutId=[\da-f-]{36}$/u)
    const checkouts = await startedCheckouts(request, userId)
    expect(checkouts.at(-1)).toMatchObject({ locale: POLAR_CHECKOUT_DEFAULT_LANGUAGE })
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

  for (const tier of LICENSE_TIERS) {
    test(`a ${tier} purchase grants the licence and its key, and its email says how to start`, async ({ appPage, authPage, page, request }) => {
      await authPage.gotoSignUp()
      const { email, userId } = await signUpAndVerify({ authPage, page, request })

      await buyLicense(request, { tier, userId })
      await page.goto(ROUTES.APP_LICENSE, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
      await appPage.waitForAppReady()

      await expect(page.getByRole("button", { name: "Copy licence key" })).toBeVisible()
      for (const { command } of CLI_KEY_LINES) {
        await expect(page.getByRole("button", { name: `Copy ${command}` })).toBeVisible()
      }
      const confirmation = await expectPurchaseConfirmation(request, email)
      expect(confirmation).toContain("Get started")
      expect(confirmation.includes(`${ROUTES.COURSES}"`)).toBe(COURSE_TIERS.includes(tier))
    })
  }

  test("the first steps tick off as the buyer copies the key, activates it and generates a project", async ({
    appPage,
    authPage,
    baseURL,
    context,
    page,
    request,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"])
    await authPage.gotoSignUp()
    const { userId } = await signUpAndVerify({ authPage, page, request })
    await buyLicense(request, { tier: LICENSE_TIER.CORE, userId })
    await page.goto(ROUTES.APP, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()
    await appPage.waitForHydration(checklist(page))
    await expect(checklist(page).getByRole("progressbar", { name: "1 of 4 done" })).toBeVisible()
    const key = await checklist(page).getByRole("listitem").filter({ hasText: "Copy your licence key" }).locator("code").innerText()

    await page.getByRole("button", { name: "Copy licence key" }).click()
    await expect(stepDone(page, "Copy your licence key")).toBeAttached()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(key)
    for (const { command } of CLI_SETUP_LINES) {
      await page.getByRole("button", { name: `Copy ${command}` }).click()
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(command)
    }

    const machine = await deriveMachineId(ACTIVATION_KIND.MACHINE, [crypto.randomUUID()])
    const connection = { credentials: { key, machine }, origin: String(baseURL) }
    const activationRequest = apiRequest(
      API_ENDPOINT.ACTIVATE,
      { body: { cliVersion: "0.1.0", kind: ACTIVATION_KIND.MACHINE, label: "e2e-first-steps", platform: PLATFORM.LINUX } },
      connection,
    )
    const activation = await readApiResponse(API_ENDPOINT.ACTIVATE, await fetch(fromOwnAddress(activationRequest)))
    if (!activation.success) {
      throw new Error("The purchased key did not activate")
    }
    await expect(stepDone(page, "Activate the key on your machine")).toBeAttached()
    await expect(checklist(page).getByRole("progressbar", { name: "3 of 4 done" })).toBeVisible()

    const bundleRequest = apiRequest(
      API_ENDPOINT.BUNDLE,
      { body: { answers: STACK_DEFAULTS, version: TEST_BUNDLE.version }, params: { activationId: activation.data.activationId } },
      connection,
    )
    const bundle = await readApiResponse(API_ENDPOINT.BUNDLE, await fetch(fromOwnAddress(bundleRequest)))
    expect(bundle.success).toBe(true)
    await expect(stepDone(page, "Generate your first project")).toBeAttached()
    await expect(checklist(page).getByRole("progressbar", { name: "4 of 4 done" })).toBeVisible()
    for (const colorScheme of COLOR_SCHEMES) {
      await page.emulateMedia({ colorScheme })
      expect(await accessibilityViolations(page)).toEqual([])
    }
  })

  test("a refunded licence says so without its key, commands or a pending key, and offers a new one", async ({
    appPage,
    authPage,
    page,
    request,
  }) => {
    await authPage.gotoSignUp()
    const { userId } = await signUpAndVerify({ authPage, page, request })
    const { refund } = await buyLicense(request, { tier: LICENSE_TIER.CORE, userId })
    await refund()

    await page.goto(ROUTES.APP_LICENSE, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()

    await expect(page.getByText("This licence was refunded, so its key no longer works.", { exact: false })).toBeVisible()
    await expect(page.getByRole("link", { name: "Buy a new licence" })).toHaveAttribute("href", "#license-offer")
    await expect(page.getByRole("link", { name: "Email support" })).toHaveAttribute("href", `mailto:${CONTACT_EMAIL}`)
    await expect(page.getByRole("button", { name: "Copy licence key" })).toHaveCount(0)
    await expect(page.getByText("Your key is being issued.", { exact: false })).toHaveCount(0)
    await expect(page.getByRole("region", { name: "Get your licence" })).toBeVisible()
    for (const colorScheme of COLOR_SCHEMES) {
      await page.emulateMedia({ colorScheme })
      expect(await accessibilityViolations(page)).toEqual([])
    }

    await page.goto(ROUTES.APP, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()
    await expect(checklist(page)).toHaveCount(0)
    await expect(page.getByRole("region", { name: "Get your licence" })).toBeVisible()
  })
})
