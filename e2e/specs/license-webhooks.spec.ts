import assert from "node:assert/strict"

import type { APIRequestContext, Page } from "@playwright/test"
import { API_ENDPOINT, API_ERROR } from "@saasyland/stack/api"

import { TIER_PRICES } from "../../src/data/license"
import { REFUND_TERMS } from "../../src/data/refunds"
import { polarDashboardUrl } from "../../src/integrations/polar/polar.constants"
import { HTTP_STATUS } from "../../src/modules/_core/constants/api"
import { toMinorUnits } from "../../src/modules/_core/constants/currency"
import { DEFAULT_CURRENCY_CODE } from "../../src/modules/_core/constants/pricing"
import { LICENSE_ACTIVATION_LIMITS, LICENSE_EMAIL_PURPOSE, LICENSE_TIER, type LicenseTier } from "../../src/modules/license/license.constants"
import { CONTACT_EMAIL } from "../../src/presentation/branding"
import { ROUTES } from "../../src/routes"
import { TEST_POLAR } from "../data/polar-settings"
import { expect, test } from "../fixtures/auth"
import { signUpBuyer, signUpVerifiedBuyer } from "../fixtures/buyer"
import { CLI_ACTIVATION, machineConnection, sendToApi } from "../fixtures/cli-api"
import { getSentEmails } from "../fixtures/emails"
import { expectPurchaseConfirmation } from "../fixtures/license-emails"
import {
  buyLicense,
  deliverGuestOrder,
  deliverPaidOrder,
  deliverWebhook,
  orderLicense,
  payCheckout,
  refundOrder,
  revokeLicenseKey,
  signPaidOrder,
  signedPurchase,
  startedCheckouts,
} from "../fixtures/license"
import { payInCheckoutOverlay } from "../fixtures/polar-checkout"
import type { BasePage } from "../pages"
import { APP_NAVIGATION_WAIT_UNTIL } from "../pages/base-page"

const NON_LICENCE_PRODUCT_ID = "prod_e2e-not-a-licence"
const FORGED_SECRET = `${TEST_POLAR.POLAR_WEBHOOK_SECRET}-forged`
const WEBHOOK_SIGNATURE_HEADER = "webhook-signature"
const HALF = 2

const isConfirmation = ({ idempotencyKey }: { idempotencyKey: string }): boolean =>
  idempotencyKey.startsWith(`${LICENSE_EMAIL_PURPOSE.PURCHASE_CONFIRMATION}/`)

const purchaseConfirmations = async (request: APIRequestContext, email: string) => (await getSentEmails(request, email)).filter(isConfirmation)

const openLicence = async (appPage: BasePage, page: Page): Promise<void> => {
  await page.goto(ROUTES.APP.LICENSE, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
}

const machinesInUse = (used: number, tier: LicenseTier): string =>
  `${String(used)} of ${String(LICENSE_ACTIVATION_LIMITS[tier])} in use`

test.describe("licence webhooks", () => {
  test("a second delivery of the same order.paid leaves one licence with its key and sends one confirmation", async ({
    appPage,
    baseURL,
    page,
    request,
  }) => {
    const { email, userId } = await signUpVerifiedBuyer(page, request, baseURL)
    const { issueKey, key, redeliverPayment } = await orderLicense(request, { tier: LICENSE_TIER.CORE, userId })
    await issueKey()

    await redeliverPayment()

    await openLicence(appPage, page)
    await expect(page.getByRole("heading", { name: "Core", exact: true })).toBeVisible()
    await expect(page.getByText(key, { exact: true })).toBeVisible()
    expect(await purchaseConfirmations(request, email)).toHaveLength(1)
  })

  test("a key granted before its order.paid is refused until the order arrives, and Polar's retry then attaches it", async ({
    appPage,
    baseURL,
    page,
    request,
  }) => {
    const { userId } = await signUpVerifiedBuyer(page, request, baseURL)
    const { grantCreated, key, orderPaid } = await signedPurchase(request, { tier: LICENSE_TIER.COMPLETE, userId })

    expect((await deliverWebhook(request, grantCreated)).ok()).toBe(false)
    expect((await deliverWebhook(request, orderPaid)).ok()).toBe(true)
    expect((await deliverWebhook(request, grantCreated)).ok()).toBe(true)

    await openLicence(appPage, page)
    await expect(page.getByRole("heading", { name: "Complete", exact: true })).toBeVisible()
    await expect(page.getByText(key, { exact: true })).toBeVisible()
    await expect(page.getByText(machinesInUse(0, LICENSE_TIER.COMPLETE))).toBeVisible()
  })

  test("an order.paid whose customer has no account grants nothing and emails the owner the order and its tier", async ({ request }) => {
    const email = `guest.${crypto.randomUUID()}@example.test`

    const orderId = await deliverGuestOrder(request, { email, name: "Guest Buyer", tier: LICENSE_TIER.AGENCY })

    const isAlert = ({ html, idempotencyKey }: { html: string; idempotencyKey: string }): boolean =>
      idempotencyKey.startsWith(`${LICENSE_EMAIL_PURPOSE.UNMATCHED_ORDER_ALERT}/`) && html.includes(orderId)
    await expect.poll(async () => (await getSentEmails(request, CONTACT_EMAIL)).filter(isAlert).length).toBe(1)
    const [alert] = (await getSentEmails(request, CONTACT_EMAIL)).filter(isAlert)
    assert(alert !== undefined)
    expect(alert.subject).toContain("Agency")
    expect(alert.html).toContain(email)
    expect(alert.html).toContain(polarDashboardUrl(TEST_POLAR.POLAR_SERVER, "sales", orderId))
    expect(await getSentEmails(request, email)).toEqual([])
  })

  test("an order.paid for a product that is not a licence grants no licence and sends no confirmation", async ({
    appPage,
    baseURL,
    page,
    request,
  }) => {
    const { email, userId } = await signUpVerifiedBuyer(page, request, baseURL)

    await deliverPaidOrder(request, { productId: NON_LICENCE_PRODUCT_ID, tier: LICENSE_TIER.CORE, userId, withdrawalConsent: true })

    await openLicence(appPage, page)
    await expect(page.getByRole("region", { name: "Get your licence" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Copy licence key" })).toHaveCount(0)
    expect(await purchaseConfirmations(request, email)).toEqual([])
  })

  test("a Polar webhook with a missing or wrong signature is refused and changes nothing", async ({ appPage, baseURL, page, request }) => {
    const { email, userId } = await signUpVerifiedBuyer(page, request, baseURL)
    const order = { tier: LICENSE_TIER.CORE, userId, withdrawalConsent: true }
    const signed = signPaidOrder(order)
    const unsignedHeaders = Object.fromEntries(Object.entries(signed.headers).filter(([name]) => name !== WEBHOOK_SIGNATURE_HEADER))

    const forged = await deliverWebhook(request, signPaidOrder(order, FORGED_SECRET))
    const unsigned = await deliverWebhook(request, { body: signed.body, headers: unsignedHeaders })

    expect(forged.status()).toBe(HTTP_STATUS.FORBIDDEN)
    expect(unsigned.status()).toBe(HTTP_STATUS.FORBIDDEN)
    await openLicence(appPage, page)
    await expect(page.getByRole("region", { name: "Get your licence" })).toBeVisible()
    expect(await purchaseConfirmations(request, email)).toEqual([])
  })

  test("without the consent, the purchase confirmation states the right of withdrawal and its period", async ({ baseURL, request }) => {
    const { email, userId } = await signUpBuyer(baseURL)

    await deliverPaidOrder(request, { tier: LICENSE_TIER.CORE, userId, withdrawalConsent: false })

    const confirmation = await expectPurchaseConfirmation(request, email)
    expect(confirmation).toContain(
      `You can withdraw from this purchase within ${String(REFUND_TERMS.WITHDRAWAL_DAYS)} days of the order date without giving a reason`,
    )
    expect(confirmation).toContain(`${ROUTES.WITHDRAWAL}"`)
    expect(confirmation).not.toContain("the right of withdrawal does not apply")
  })

  test("a partial refund keeps the licence active and its key working", async ({ appPage, baseURL, page, request }) => {
    const { userId } = await signUpVerifiedBuyer(page, request, baseURL)
    const { key, orderId } = await buyLicense(request, { tier: LICENSE_TIER.CORE, userId })

    await refundOrder(request, orderId, toMinorUnits(TIER_PRICES[LICENSE_TIER.CORE], DEFAULT_CURRENCY_CODE) / HALF)

    await openLicence(appPage, page)
    await expect(page.getByText(key, { exact: true })).toBeVisible()
    await expect(page.getByText("This licence was refunded", { exact: false })).toHaveCount(0)
    expect(await sendToApi(API_ENDPOINT.ACTIVATE, CLI_ACTIVATION, await machineConnection(key, baseURL))).toMatchObject({ success: true })
  })

  test("a refund stops the key: the licence page says so and the CLI licence API refuses it with licenseRefunded", async ({
    appPage,
    baseURL,
    page,
    request,
  }) => {
    const { userId } = await signUpVerifiedBuyer(page, request, baseURL)
    const { key, orderId } = await buyLicense(request, { tier: LICENSE_TIER.CORE, userId })
    const connection = await machineConnection(key, baseURL)
    const activated = await sendToApi(API_ENDPOINT.ACTIVATE, CLI_ACTIVATION, connection)
    assert(activated.success)

    await refundOrder(request, orderId)

    await openLicence(appPage, page)
    await expect(page.getByText("This licence was refunded, so its key no longer works.", { exact: false })).toBeVisible()
    await expect(page.getByText(key, { exact: true })).toHaveCount(0)
    expect(await sendToApi(API_ENDPOINT.VALIDATE, { params: { activationId: activated.data.activationId } }, connection)).toStrictEqual({
      failure: { code: API_ERROR.LICENSE_REFUNDED },
      success: false,
    })
  })

  test("a revoked licence key marks the licence inactive, and the CLI licence API refuses the key with licenseRevoked", async ({
    appPage,
    baseURL,
    page,
    request,
  }) => {
    const { userId } = await signUpVerifiedBuyer(page, request, baseURL)
    const { key, orderId } = await buyLicense(request, { tier: LICENSE_TIER.AGENCY, userId })
    const connection = await machineConnection(key, baseURL)
    expect(await sendToApi(API_ENDPOINT.LICENSE, {}, connection)).toMatchObject({ success: true })

    await revokeLicenseKey(request, orderId)

    await openLicence(appPage, page)
    await expect(page.getByText("This licence is no longer active.", { exact: false })).toBeVisible()
    await expect(page.getByText(key, { exact: true })).toHaveCount(0)
    expect(await sendToApi(API_ENDPOINT.LICENSE, {}, connection)).toStrictEqual({
      failure: { code: API_ERROR.LICENSE_REVOKED },
      success: false,
    })
  })

  test("a full refund of an upgrade puts the licence back on Core and its machine limit, and the key still works", async ({
    appPage,
    baseURL,
    page,
    request,
  }) => {
    const { userId } = await signUpVerifiedBuyer(page, request, baseURL)
    const { key } = await buyLicense(request, { tier: LICENSE_TIER.CORE, userId })
    await page.goto(`${ROUTES.APP.LICENSE}?tier=${LICENSE_TIER.COMPLETE}`, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()
    await page.getByRole("region", { name: "Upgrade to Complete" }).getByRole("button", { name: "Upgrade to Complete" }).click()
    await payInCheckoutOverlay(page)
    const [upgrade] = await startedCheckouts(request, userId)
    assert(upgrade !== undefined)
    const { orderId } = await payCheckout(request, upgrade.id)
    await openLicence(appPage, page)
    await expect(page.getByText(machinesInUse(0, LICENSE_TIER.COMPLETE))).toBeVisible()

    await refundOrder(request, orderId)

    await openLicence(appPage, page)
    await expect(page.getByRole("heading", { name: "Core", exact: true })).toBeVisible()
    await expect(page.getByText(key, { exact: true })).toBeVisible()
    await expect(page.getByText(machinesInUse(0, LICENSE_TIER.CORE))).toBeVisible()
    expect(await sendToApi(API_ENDPOINT.ACTIVATE, CLI_ACTIVATION, await machineConnection(key, baseURL))).toMatchObject({
      data: { license: { machineLimit: LICENSE_ACTIVATION_LIMITS[LICENSE_TIER.CORE], machinesUsed: 1, tier: LICENSE_TIER.CORE } },
      success: true,
    })
  })
})
