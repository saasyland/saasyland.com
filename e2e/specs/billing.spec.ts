import type { APIRequestContext, BrowserContext, Page } from "@playwright/test"
import * as zod from "zod"

import { POLAR_CUSTOMER_SESSION_TOKEN_PARAM, POLAR_DASHBOARD_HOSTS } from "../../src/integrations/polar/polar.constants"
import { HTTP_STATUS } from "../../src/modules/_core/constants/api"
import { POLAR_CUSTOMER_PORTAL_PATH } from "../../src/platform/testing/lib/polar"
import * as ROUTES from "../../src/routes"
import { TEST_PASSWORD } from "../data/accounts"
import { TEST_BILLING_PRODUCTS, TEST_BILLING_SHOWN } from "../data/billing"
import { COLOR_SCHEMES, accessibilityViolations } from "../fixtures/accessibility"
import { expect, test } from "../fixtures/auth"
import { expectVerificationEmail } from "../fixtures/emails"
import type { AuthPage } from "../pages"
import { APP_NAVIGATION_WAIT_UNTIL } from "../pages/base-page"

const POLAR_HOSTS: ReadonlySet<string> = new Set(Object.values(POLAR_DASHBOARD_HOSTS))

const isPolarPage = (url: URL, path: string): boolean => url.protocol === "https:" && POLAR_HOSTS.has(url.host) && url.pathname === path

const invoicePath = (orderId: string): string => `/invoices/${orderId}.pdf`
const PORTAL_HEADING = "Polar customer portal test double"
const INVOICE_HEADING = "Polar invoice test double"

const sessionSchema = zod.object({ user: zod.object({ id: zod.string() }) })

const signedWebhookSchema = zod.object({ body: zod.string(), headers: zod.record(zod.string(), zod.string()) })

const purchaseSchema = zod.object({
  invoiceNumber: zod.string(),
  orderCreated: signedWebhookSchema,
  orderId: zod.string(),
  orderUpdated: signedWebhookSchema,
  subscriptionsCreated: zod.array(signedWebhookSchema),
})

type SignedWebhook = zod.infer<typeof signedWebhookSchema>

interface Purchase {
  readonly checkout?: string
  readonly customer: string
  readonly product: string
}

const deliver = async (request: APIRequestContext, { body, headers }: SignedWebhook): Promise<void> => {
  const response = await request.post(`${ROUTES.API_AUTH_BASE}${ROUTES.API_AUTH_POLAR.WEBHOOKS}`, { data: body, headers })
  expect(response.ok()).toBe(true)
}

const placeOrder = async (request: APIRequestContext, { checkout, customer, product }: Purchase) => {
  const response = await request.get("/__test/polar/billing-purchase", {
    params: { customer, product, ...(checkout === undefined ? {} : { checkout }) },
  })
  expect(response.ok()).toBe(true)
  return purchaseSchema.parse(await response.json())
}

const buy = async (request: APIRequestContext, purchase: Purchase) => {
  const placed = await placeOrder(request, purchase)
  await deliver(request, placed.orderCreated)
  await deliver(request, placed.orderUpdated)
  for (const subscription of placed.subscriptionsCreated) {
    await deliver(request, subscription)
  }
  return placed
}

const signUp = async (
  { authPage, page, request }: { authPage: AuthPage; page: Page; request: APIRequestContext },
  { confirms }: { confirms: boolean },
): Promise<string> => {
  const id = crypto.randomUUID()
  const email = `billing.${id}@example.test`
  await page.setExtraHTTPHeaders({ "CF-Connecting-IP": `2001:db8:${id.slice(0, 4)}::` })
  await authPage.signUp(email, TEST_PASSWORD)
  await expect(page).toHaveURL(/\/app\/?$/u)
  if (confirms) {
    await page.goto((await expectVerificationEmail(request, email)).toString(), { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await expect(page).toHaveURL(/\/app\/?$/u)
  }
  await authPage.waitForAppReady()
  return sessionSchema.parse(await (await page.request.get("/api/auth/get-session")).json()).user.id
}

const servePolarPages = async (context: BrowserContext): Promise<void> => {
  await context.route(
    (url) => POLAR_HOSTS.has(url.host) && (url.pathname === POLAR_CUSTOMER_PORTAL_PATH || url.pathname.startsWith("/invoices/")),
    async (route) => {
      const { pathname } = new URL(route.request().url())
      const heading = pathname === POLAR_CUSTOMER_PORTAL_PATH ? PORTAL_HEADING : INVOICE_HEADING
      await route.fulfill({ body: `<!doctype html><html lang="en"><title>${heading}</title><h1>${heading}</h1></html>`, contentType: "text/html" })
    },
  )
}

const openBilling = async (page: Page, authPage: AuthPage, search = ""): Promise<void> => {
  await page.goto(`${ROUTES.APP_BILLING}${search}`, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await authPage.waitForAppReady()
}

const listItem = (page: Page, text: string) => page.getByRole("listitem").filter({ hasText: text })

test.describe("billing", () => {
  test("a customer sees what they bought, opens an invoice and manages billing in Polar's customer portal", async ({
    authPage,
    context,
    page,
    request,
  }) => {
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    await servePolarPages(context)
    const customer = await signUp({ authPage, page, request }, { confirms: true })
    const kit = await buy(request, { customer, product: TEST_BILLING_PRODUCTS.KIT.id })
    await buy(request, { customer, product: TEST_BILLING_PRODUCTS.PLAN.id })

    const navigation = page.getByRole("navigation", { name: "App navigation", exact: true })
    await navigation.getByRole("link", { name: "Billing", exact: true }).click()
    await expect(page).toHaveURL(/\/app\/billing$/u)
    await authPage.waitForAppReady()
    await expect(navigation.getByRole("link", { name: "Billing", exact: true })).toHaveAttribute("aria-current", "page")
    await expect(page.getByRole("heading", { level: 1, name: "Billing", exact: true })).toBeVisible()
    const plan = listItem(page, TEST_BILLING_PRODUCTS.PLAN.name)
    await expect(plan.getByText(TEST_BILLING_SHOWN.planPrice, { exact: true })).toBeVisible()
    await expect(plan.getByText("Active", { exact: true })).toBeVisible()
    await expect(plan.getByText(/^Renews on /u)).toBeVisible()
    const order = listItem(page, TEST_BILLING_PRODUCTS.KIT.name)
    await expect(order.getByText(kit.invoiceNumber, { exact: true })).toBeVisible()
    await expect(order.getByText(TEST_BILLING_SHOWN.kitTotal, { exact: true })).toBeVisible()
    await expect(order.getByText("Paid", { exact: true })).toBeVisible()
    for (const colorScheme of COLOR_SCHEMES) {
      await page.emulateMedia({ colorScheme })
      expect(await accessibilityViolations(page)).toEqual([])
    }

    await order.getByRole("button", { name: `Invoice ${kit.invoiceNumber}`, exact: true }).click()
    await expect(page).toHaveURL((url) => isPolarPage(url, invoicePath(kit.orderId)))
    await expect(page.getByRole("heading", { name: INVOICE_HEADING })).toBeVisible()

    await openBilling(page, authPage)
    await page.getByRole("button", { name: "Manage billing", exact: true }).click()
    await expect(page).toHaveURL((url) => isPolarPage(url, POLAR_CUSTOMER_PORTAL_PATH))
    expect(new URL(page.url()).searchParams.get(POLAR_CUSTOMER_SESSION_TOKEN_PARAM)).toMatch(/^polar_cst_/u)
    await expect(page.getByRole("heading", { name: PORTAL_HEADING })).toBeVisible()
    expect(errors).toEqual([])
  })

  test("a buyer back from Polar's checkout sees the payment received until Polar's order arrives, then a thank-you with the order listed", async ({
    authPage,
    page,
    request,
  }) => {
    const customer = await signUp({ authPage, page, request }, { confirms: false })
    const checkout = crypto.randomUUID()
    const placed = await placeOrder(request, { checkout, customer, product: TEST_BILLING_PRODUCTS.KIT.id })

    await openBilling(page, authPage, `?checkoutId=${checkout}&${POLAR_CUSTOMER_SESSION_TOKEN_PARAM}=polar_cst_e2e`)
    await expect(page).toHaveURL(`${ROUTES.APP_BILLING}?checkoutId=${checkout}`)
    await expect(page.getByRole("heading", { name: "Payment received", exact: true })).toBeVisible()
    await expect(page.getByText("You have not bought anything yet.", { exact: true })).toBeVisible()

    await deliver(request, placed.orderCreated)
    await expect(listItem(page, TEST_BILLING_PRODUCTS.KIT.name).getByText("Pending", { exact: true })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Payment received", exact: true })).toBeVisible()

    await deliver(request, placed.orderUpdated)
    await expect(page.getByRole("heading", { name: "Thank you for your order", exact: true })).toBeVisible()
    await expect(listItem(page, TEST_BILLING_PRODUCTS.KIT.name).getByText("Paid", { exact: true })).toBeVisible()
  })

  test("a customer who has not confirmed the address sees the orders and invoices, but not the portal, which refuses them", async ({
    authPage,
    page,
    request,
  }) => {
    const customer = await signUp({ authPage, page, request }, { confirms: false })
    await openBilling(page, authPage)
    await expect(page.getByText("You have not bought anything yet.", { exact: true })).toBeVisible()
    await expect(page.getByRole("button", { name: "Manage billing" })).toHaveCount(0)

    const kit = await buy(request, { customer, product: TEST_BILLING_PRODUCTS.KIT.id })
    await openBilling(page, authPage)

    await expect(listItem(page, TEST_BILLING_PRODUCTS.KIT.name).getByRole("button", { name: `Invoice ${kit.invoiceNumber}` })).toBeVisible()
    await expect(page.getByRole("button", { name: "Manage billing" })).toHaveCount(0)
    expect((await page.request.get(ROUTES.API_AUTH_CUSTOMER_PORTAL)).status()).toBe(HTTP_STATUS.FORBIDDEN)
  })
})
