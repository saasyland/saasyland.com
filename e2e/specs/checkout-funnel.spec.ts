import assert from "node:assert/strict"

import type { APIRequestContext, Page } from "@playwright/test"
import { STACK_DEFAULTS } from "@saasyland/stack"
import { ACTIVATION_KIND, API_ENDPOINT, PLATFORM, apiRequest, deriveMachineId, readApiResponse } from "@saasyland/stack/api"
import * as zod from "zod"

import { TEST_ACCOUNTS, TEST_PASSWORD } from "../data/accounts"
import { TEST_BUNDLE, TEST_CHECKOUT_ID } from "../data/licenses"
import { COLOR_SCHEMES, accessibilityViolations } from "../fixtures/accessibility"
import { expect, test } from "../fixtures/auth"
import { expectVerificationEmail } from "../fixtures/emails"
import { expectPurchaseConfirmation } from "../fixtures/license-emails"
import { buyLicense, deliverPaidOrder, orderLicense, payCheckout, startedCheckouts } from "../fixtures/license"
import {
  POLAR_CUSTOMER_SESSION_TOKEN,
  checkoutOverlay,
  closeCheckoutOverlay,
  isPolarCheckoutPage,
  payInCheckoutOverlay,
  payOnPolarCheckoutPage,
  refusePolarCheckoutEmbedding,
} from "../fixtures/polar-checkout"
import type { AuthPage } from "../pages"
import { APP_NAVIGATION_WAIT_UNTIL } from "../pages/base-page"

import { POLAR_CUSTOMER_SESSION_TOKEN_PARAM, POLAR_CHECKOUT_DEFAULT_LANGUAGE } from "../../src/integrations/polar/polar.constants"
import { COUNTRY_HEADER, HTTP_STATUS, IP_ADDRESS_HEADER } from "../../src/modules/_core/constants/api"
import { toMinorUnits } from "../../src/modules/_core/constants/currency"
import { DEFAULT_CURRENCY_CODE } from "../../src/modules/_core/constants/pricing"
import { pppMultiplierKey, regionalPrice } from "../../src/modules/license/license.pricing"
import { TIER_PRICES } from "../../src/data/license"
import { LICENSE_ACTIVATION_LIMITS, LICENSE_TIER, LICENSE_TIERS } from "../../src/modules/license/license.constants"
import { ORDER_CHECKOUT_METADATA } from "../../src/modules/order/order.constants"
import { CLI_INIT_COMMAND, CLI_KEY_LINES, CLI_SETUP_LINES } from "../../src/data/cli"
import { TEST_COURSE, TEST_LESSONS } from "../data/courses"
import { CHECKOUT_OVERLAY_GRACE_MS } from "../../src/lib/checkout-overlay"
import { CONTACT_EMAIL } from "../../src/presentation/branding"
import * as ROUTES from "../../src/routes"

const [, customer] = TEST_ACCOUNTS
const [, , paid] = TEST_LESSONS
const SIGN_UP_PASSWORD = "StrongPassword123!"
const BROWSER_CLOCK_BEHIND_MS = 300_000
const PAGE_MARKER = "__pageBeforeCheckout"
const OVERLAY_TITLE = "Polar checkout"

const sessionSchema = zod.object({ user: zod.object({ id: zod.string() }) })

const COURSE_TIERS: readonly string[] = [LICENSE_TIER.COMPLETE, LICENSE_TIER.AGENCY]

const checklist = (page: Page) => page.getByRole("region", { name: "Get started" })

const stepDone = (page: Page, title: string) => checklist(page).getByRole("listitem").filter({ hasText: title }).getByText("Done")

const markPage = async (page: Page): Promise<void> => {
  await page.evaluate((marker) => Reflect.set(globalThis, marker, true), PAGE_MARKER)
}

const isSamePage = async (page: Page): Promise<unknown> => page.evaluate((marker) => Reflect.get(globalThis, marker), PAGE_MARKER)

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

  test("a tier picked on the landing page goes from sign-up straight to checkout, and the key, the billing portal and paid lessons wait for the confirmed email", async ({
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
    await markPage(page)
    await chosen.getByRole("button", { name: "Continue to checkout" }).click()

    await expect(checkoutOverlay(page)).toBeFocused()
    await expect(checkoutOverlay(page)).toHaveAttribute("title", OVERLAY_TITLE)
    await expect(page).toHaveURL(`/app?tier=${LICENSE_TIER.COMPLETE}`)
    await expect(page.getByRole("dialog")).toHaveCount(0)
    const [checkout] = await startedCheckouts(request, userId)
    expect(checkout).toMatchObject({
      custom_field_data: {},
      embed_origin: new URL(page.url()).origin,
      locale: "en",
      metadata: { [ORDER_CHECKOUT_METADATA.LOCALE]: "en-US" },
      return_url: new URL(`/app?tier=${LICENSE_TIER.COMPLETE}`, page.url()).href,
    })
    await payInCheckoutOverlay(page)

    await expect(page).toHaveURL(new RegExp(String.raw`/app\?checkoutId=[\da-f-]{36}&tier=${LICENSE_TIER.COMPLETE}$`, "u"))
    await expect(checkoutOverlay(page)).toHaveCount(0)
    await expect(page.getByRole("heading", { name: "Payment received" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Get Core" })).toHaveCount(0)
    expect(await isSamePage(page)).toBe(true)

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
    await expect(page.getByRole("link", { name: "Invoices and receipts" })).toHaveAttribute("href", ROUTES.APP_BILLING)
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
    await payInCheckoutOverlay(page)
    await expect(page).toHaveURL((url) => url.pathname === ROUTES.APP && url.searchParams.has("checkoutId") && url.searchParams.get("redirect") === lesson)
    await deliverPaidOrder(request, { tier: LICENSE_TIER.COMPLETE, userId, withdrawalConsent: true })

    await expect(page.getByRole("link", { name: "Continue where you left off" })).toHaveAttribute("href", lesson)
  })

  test("opens Polar's checkout over the page without a dialog of its own, in the buyer's language, with a back button and the consent box left for the buyer", async ({
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

    await page.getByRole("button", { name: "Wybierz pakiet Podstawa", exact: true }).click()

    await expect(checkoutOverlay(page)).toHaveAttribute("title", "Płatność przez Polar")
    await expect(page).toHaveURL(`/pl-PL${ROUTES.APP_LICENSE}`)
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
    await expect(checkoutOverlay(page)).toHaveAttribute("title", "Оплата через Polar")
    const checkouts = await startedCheckouts(request, userId)
    expect(checkouts.at(-1)).toMatchObject({ locale: POLAR_CHECKOUT_DEFAULT_LANGUAGE })
  })

  test("closing Polar's checkout without paying leaves the buyer where they were, with the button ready and focused", async ({
    appPage,
    authPage,
    page,
  }) => {
    await authPage.signIn(customer.email)
    await expect(page).toHaveURL(ROUTES.APP)
    await page.goto(ROUTES.APP_LICENSE, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()
    await markPage(page)
    const button = page.getByRole("button", { name: "Get Core", exact: true })

    await button.click()

    await expect(checkoutOverlay(page)).toBeFocused()
    await expect(button).toBeEnabled()
    for (const colorScheme of COLOR_SCHEMES) {
      await page.emulateMedia({ colorScheme })
      expect(await accessibilityViolations(page)).toEqual([])
    }
    await closeCheckoutOverlay(page)

    await expect(checkoutOverlay(page)).toHaveCount(0)
    await expect(button).toBeFocused()
    await expect(button).toBeEnabled()
    await expect(page).toHaveURL(ROUTES.APP_LICENSE)
    await expect(page.getByRole("heading", { name: "Payment received" })).toHaveCount(0)
    expect(await isSamePage(page)).toBe(true)
  })

  test("a browser that cannot show Polar's checkout over the page goes to Polar's checkout page instead", async ({
    appPage,
    authPage,
    context,
    page,
  }) => {
    await refusePolarCheckoutEmbedding(context)
    await authPage.signIn(customer.email)
    await expect(page).toHaveURL(ROUTES.APP)
    await page.goto(ROUTES.APP_LICENSE, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()

    await page.getByRole("button", { name: "Get Core", exact: true }).click()

    await page.waitForURL(isPolarCheckoutPage, { timeout: CHECKOUT_OVERLAY_GRACE_MS * 2 })
    await expect(page.getByRole("heading", { name: "Polar checkout test double" })).toBeVisible()
  })

  test("a buyer who pays on Polar's own checkout page comes back without Polar's customer session token in any address, signed in or not", async ({
    appPage,
    authPage,
    baseURL,
    context,
    page,
    request,
  }) => {
    await refusePolarCheckoutEmbedding(context)
    await authPage.gotoSignUp()
    const { email, userId } = await signUpAndVerify({ authPage, page, request })
    await page.goto(ROUTES.APP_LICENSE, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()
    await page.getByRole("button", { name: "Get Core", exact: true }).click()
    await page.waitForURL(isPolarCheckoutPage, { timeout: CHECKOUT_OVERLAY_GRACE_MS * 2 })
    const [checkout] = await startedCheckouts(request, userId)
    assert(checkout !== undefined)
    const success = `${ROUTES.APP}?checkoutId=${checkout.id}&tier=${LICENSE_TIER.CORE}`
    const fromPolar = new URL(`${success}&${POLAR_CUSTOMER_SESSION_TOKEN_PARAM}=${POLAR_CUSTOMER_SESSION_TOKEN}`, baseURL).href
    const carriers: string[] = []
    page.on("request", (sent) => {
      if (`${sent.url()} ${sent.headers()["referer"] ?? ""}`.includes(POLAR_CUSTOMER_SESSION_TOKEN)) {
        carriers.push(sent.url())
      }
    })

    await payOnPolarCheckoutPage(page)

    await expect(page).toHaveURL(success)
    await expect(page.getByRole("heading", { name: "Payment received" })).toBeVisible()

    await context.clearCookies()
    await page.goto(fromPolar, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await authPage.waitForAppReady()

    await expect(page).toHaveURL(`${ROUTES.SIGN_IN}?${new URLSearchParams({ redirect: success }).toString()}`)
    expect(await page.content()).not.toContain(POLAR_CUSTOMER_SESSION_TOKEN)
    await authPage.emailField().fill(email)
    await authPage.passwordField().fill(SIGN_UP_PASSWORD)
    await authPage.signInSubmitButton().click()
    await expect(page).toHaveURL(success)
    await expect(page.getByRole("heading", { name: "Payment received" })).toBeVisible()
    expect(carriers).toStrictEqual([fromPolar, fromPolar])
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
    await expect(page.getByRole("button", { name: "Get Core", exact: true })).toBeEnabled()

    await deliverPaidOrder(request, { tier: LICENSE_TIER.CORE, userId })
    await page.getByRole("button", { name: "Get Core", exact: true }).click()

    await expect(
      page.getByText(
        "You already have an active licence. To upgrade, choose a higher tier on your licence page; to move to a lower one, email hello@saasyland.com.",
      ),
    ).toBeVisible()
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
    page,
    readClipboard,
    request,
  }) => {
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
    expect(await readClipboard()).toBe(key)
    for (const { command } of CLI_SETUP_LINES) {
      await page.getByRole("button", { name: `Copy ${command}` }).click()
      expect(await readClipboard()).toBe(command)
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

  test("a Core owner who picks Complete pays the difference and keeps the key, now with Complete's machines", async ({
    appPage,
    authPage,
    page,
    request,
  }) => {
    await authPage.gotoSignUp()
    const { userId } = await signUpAndVerify({ authPage, page, request })
    await buyLicense(request, { tier: LICENSE_TIER.CORE, userId })
    await page.goto(ROUTES.APP_LICENSE, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()
    const key = await page.getByRole("button", { name: "Copy licence key" }).locator("xpath=..").locator("code").innerText()

    await page.getByRole("link", { name: "Upgrade to Complete" }).click()
    await expect(page).toHaveURL(`${ROUTES.APP_LICENSE}?tier=${LICENSE_TIER.COMPLETE}`)
    const card = page.getByRole("region", { name: "Upgrade to Complete" })
    await expect(card).toBeVisible()
    const difference = TIER_PRICES[LICENSE_TIER.COMPLETE] - TIER_PRICES[LICENSE_TIER.CORE]
    await expect(card.getByText(`$${String(difference)}`, { exact: true })).toBeVisible()
    await expect(card.getByText("Your key stays the same and then activates up to 5 machines instead of 3.")).toBeVisible()
    for (const colorScheme of COLOR_SCHEMES) {
      await page.emulateMedia({ colorScheme })
      expect(await accessibilityViolations(page)).toEqual([])
    }

    await card.getByRole("button", { name: "Upgrade to Complete" }).click()
    await expect(checkoutOverlay(page)).toBeFocused()
    const [upgrade] = await startedCheckouts(request, userId)
    assert(upgrade !== undefined)
    expect(upgrade).toMatchObject({ total_amount: toMinorUnits(difference, DEFAULT_CURRENCY_CODE) })
    const sawCoreThanks = await appPage.watchForText("Thank you for buying Core.")
    await payInCheckoutOverlay(page)
    await expect(page).toHaveURL(`/app?checkoutId=${upgrade.id}&tier=${LICENSE_TIER.COMPLETE}`)
    await expect(page.getByRole("heading", { name: "Payment received" })).toBeVisible()
    await expect(page.getByRole("region", { name: "Upgrade to Complete" })).toHaveCount(0)

    await payCheckout(request, upgrade.id)

    await expect(page.getByText("Thank you for buying Complete.", { exact: false })).toBeVisible()
    expect(await sawCoreThanks()).toBe(false)
    await page.goto(ROUTES.APP_LICENSE, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()
    await expect(page.getByRole("heading", { name: "Complete", exact: true })).toBeVisible()
    await expect(page.getByText(key, { exact: true })).toBeVisible()
    await expect(page.getByText("0 of 5 in use")).toBeVisible()
    await expect(page.getByRole("link", { name: "Upgrade to Agency" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Upgrade to Complete" })).toHaveCount(0)
  })

  test("a key that arrives while the licence page is open shows its machine limit at once, without a reload", async ({
    appPage,
    authPage,
    page,
    request,
  }) => {
    await authPage.gotoSignUp()
    const { userId } = await signUpAndVerify({ authPage, page, request })
    const { issueKey } = await orderLicense(request, { tier: LICENSE_TIER.CORE, userId })
    await page.goto(ROUTES.APP_LICENSE, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()
    const pending = page.getByText("Your key is being issued. It appears here by itself in a few seconds.", { exact: true })
    await expect(pending).toBeVisible()
    await appPage.waitForHydration(pending)
    await expect(page.getByRole("heading", { name: "Machines" })).toHaveCount(0)
    await markPage(page)
    const sawNoLimit = await appPage.watchForText("0 of 0 in use")

    await issueKey()

    await expect(page.getByRole("button", { name: "Copy licence key" })).toBeVisible()
    await expect(page.getByText(`0 of ${String(LICENSE_ACTIVATION_LIMITS[LICENSE_TIER.CORE])} in use`)).toBeVisible()
    expect(await sawNoLimit()).toBe(false)
    expect(await isSamePage(page)).toBe(true)
  })

  test("a buyer from a regional-price country pays the whole-dollar price the cards show, or the full price after declining it", async ({
    appPage,
    authPage,
    page,
    request,
  }) => {
    const country = "IN"
    await authPage.gotoSignUp()
    const { userId } = await signUpAndVerify({ authPage, page, request })
    await page.setExtraHTTPHeaders({ [COUNTRY_HEADER]: country })
    await page.goto(ROUTES.APP_LICENSE, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()
    const price = regionalPrice(TIER_PRICES[LICENSE_TIER.CORE], pppMultiplierKey(country))
    await expect(page.getByRole("region", { name: "Get your licence" }).getByText(`$${String(price)}`, { exact: true }).first()).toBeVisible()

    await page.getByRole("button", { name: "Get Core", exact: true }).click()

    await expect(checkoutOverlay(page)).toBeFocused()
    const [checkout] = await startedCheckouts(request, userId)
    expect(checkout).toMatchObject({ total_amount: toMinorUnits(price, DEFAULT_CURRENCY_CODE) })

    await page.goto(ROUTES.APP_LICENSE, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()
    const offer = page.getByRole("checkbox", { name: /with regional pricing\.$/u })
    await page.locator("label").filter({ has: offer }).click()
    await expect(offer).not.toBeChecked()
    await page.getByRole("button", { name: "Get Core", exact: true }).click()

    await expect(checkoutOverlay(page)).toBeFocused()
    const [, declined] = await startedCheckouts(request, userId)
    expect(declined).toMatchObject({ total_amount: toMinorUnits(TIER_PRICES[LICENSE_TIER.CORE], DEFAULT_CURRENCY_CODE) })
  })
})
