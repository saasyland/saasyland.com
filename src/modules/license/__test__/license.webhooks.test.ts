import { env } from "cloudflare:workers"

import type { models } from "@polar-sh/sdk/2026-10"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { JSON_NULL } from "~/src/platform/testing/lib/json-null"
import {
  createGuestPolarOrder,
  createPolarOrder,
  grantPolarLicenseKey,
  setPolarCustomerExternalId,
} from "~/src/platform/testing/mocks/polar"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { POLAR_ORDER_STATUS } from "~/src/integrations/polar/polar.constants"

import { LICENSE_CHECKOUT_FIELD, LICENSE_STATUS, LICENSE_TIER } from "~/src/modules/license/license.constants"
import { licenseWebhookHandlers } from "~/src/modules/license/license.webhooks"
import type { attachLicenseKey } from "~/src/modules/license/use-cases/attach-license-key"
import type { grantLicense } from "~/src/modules/license/use-cases/grant-license"
import type { revokeLicense } from "~/src/modules/license/use-cases/revoke-license"
import type { sendPurchaseConfirmationEmail } from "~/src/modules/license/use-cases/send-purchase-confirmation-email"
import type { sendUnmatchedOrderAlert } from "~/src/modules/license/use-cases/send-unmatched-order-alert"
import { user } from "~/src/modules/user/user.schema"

const USER_ID = "018f2b9c-0000-7000-8000-000000000005"
const UNKNOWN_PRODUCT_ID = "00000000-0000-4000-8000-00000000ffff"
const DELETED_USER_ID = "018f2b9c-0000-7000-8000-0000000000de"
const ORDERED_AT = "2026-09-24T10:00:00.000Z"
const BUYER_EMAIL = "buyer@example.test"
const GUEST = { email: "guest@example.test", name: "Guest Buyer" }

const useCaseMocks = vi.hoisted(() => ({
  attachLicenseKey: vi.fn<typeof attachLicenseKey>(),
  grantLicense: vi.fn<typeof grantLicense>(),
  revokeLicense: vi.fn<typeof revokeLicense>(),
  sendPurchaseConfirmationEmail: vi.fn<typeof sendPurchaseConfirmationEmail>(),
  sendUnmatchedOrderAlert: vi.fn<typeof sendUnmatchedOrderAlert>(),
}))

vi.mock(import("@tanstack/react-start/server-only"), () => ({}))

vi.mock(import("~/src/modules/license/use-cases/attach-license-key"), () => ({
  attachLicenseKey: useCaseMocks.attachLicenseKey,
}))

vi.mock(import("~/src/modules/license/use-cases/grant-license"), () => ({ grantLicense: useCaseMocks.grantLicense }))

vi.mock(import("~/src/modules/license/use-cases/revoke-license"), () => ({ revokeLicense: useCaseMocks.revokeLicense }))

vi.mock(import("~/src/modules/license/use-cases/send-purchase-confirmation-email"), () => ({
  sendPurchaseConfirmationEmail: useCaseMocks.sendPurchaseConfirmationEmail,
}))

vi.mock(import("~/src/modules/license/use-cases/send-unmatched-order-alert"), () => ({
  sendUnmatchedOrderAlert: useCaseMocks.sendUnmatchedOrderAlert,
}))

const orderPayload = (productId: string | null = JSON_NULL, externalId?: string, status: models.OrderStatus = POLAR_ORDER_STATUS.PAID) => ({
  data: {
    created_at: ORDERED_AT,
    currency: "usd",
    customer: { email: BUYER_EMAIL, external_id: externalId, name: "Buyer" },
    customer_id: "cus_1",
    id: "ord_1",
    invoice_number: "SAASYLAND-0001",
    metadata: {},
    product_id: productId,
    status,
    total_amount: 39_900,
  },
})

const LICENSE_KEY_GRANT = { license_key_id: "lk_1" }
const paidWith = (customFieldData: models.Order["custom_field_data"]) => {
  const { data } = orderPayload(env.POLAR_PRODUCT_ID_CORE, USER_ID)
  return { data: { ...data, custom_field_data: customFieldData } }
}

const WITHOUT_CONSENT = [
  { fields: undefined, order: "an order without custom fields" },
  { fields: {}, order: "an order without the consent field" },
  { fields: { [LICENSE_CHECKOUT_FIELD.WITHDRAWAL_CONSENT]: false }, order: "an order whose consent box was left empty" },
  { fields: { [LICENSE_CHECKOUT_FIELD.WITHDRAWAL_CONSENT]: null }, order: "an order whose consent field is empty" },
  { fields: { [LICENSE_CHECKOUT_FIELD.WITHDRAWAL_CONSENT]: "true" }, order: "an order whose consent field holds text" },
  { fields: { consent: true }, order: "an order whose only checked box is another field" },
]

const grantPayload = (properties: models.BenefitGrantWebhook["properties"], externalId?: string) => ({
  data: { customer: { external_id: externalId }, id: "grant_1", order_id: "ord_1", properties },
})

const resetUseCases = (): void => {
  useCaseMocks.attachLicenseKey.mockClear()
  useCaseMocks.grantLicense.mockClear()
  useCaseMocks.revokeLicense.mockClear()
  useCaseMocks.sendPurchaseConfirmationEmail.mockReset()
  useCaseMocks.sendUnmatchedOrderAlert.mockReset()
}

const guestOrder = () => createGuestPolarOrder({ ...GUEST, productId: env.POLAR_PRODUCT_ID_AGENCY })

beforeEach(async () => {
  await db.delete(user)
  await db.insert(user).values({ email: BUYER_EMAIL, id: USER_ID, name: "Buyer" })
})

describe("license webhooks on paid orders", () => {
  it("grants the tier the buyer paid for, then confirms the purchase to the account's address", async () => {
    expect.hasAssertions()
    resetUseCases()
    const paid = orderPayload(env.POLAR_PRODUCT_ID_COMPLETE, USER_ID)

    await licenseWebhookHandlers.onOrderPaid(paid)

    expect(useCaseMocks.grantLicense).toHaveBeenCalledWith({
      polarCustomerId: "cus_1",
      polarOrderId: "ord_1",
      purchaseCreatedAt: new Date("2026-09-24T10:00:00Z"),
      tier: LICENSE_TIER.COMPLETE,
      userId: USER_ID,
      withdrawalConsentAt: undefined,
    })
    expect(useCaseMocks.sendPurchaseConfirmationEmail).toHaveBeenCalledExactlyOnceWith({
      order: paid.data,
      recipient: BUYER_EMAIL,
      tier: LICENSE_TIER.COMPLETE,
      withdrawalConsent: false,
    })
    expect(useCaseMocks.grantLicense).toHaveBeenCalledBefore(useCaseMocks.sendPurchaseConfirmationEmail)
  })

  it("records the buyer's consent to immediate delivery at the time of the order and confirms it by email", async () => {
    expect.hasAssertions()
    resetUseCases()

    await licenseWebhookHandlers.onOrderPaid(paidWith({ [LICENSE_CHECKOUT_FIELD.WITHDRAWAL_CONSENT]: true }))

    expect(useCaseMocks.grantLicense).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ purchaseCreatedAt: new Date(ORDERED_AT), withdrawalConsentAt: new Date(ORDERED_AT) }),
    )
    expect(useCaseMocks.sendPurchaseConfirmationEmail).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ withdrawalConsent: true }))
  })

  it.each(WITHOUT_CONSENT)("records no consent for $order and confirms the statutory withdrawal instead", async ({ fields }) => {
    expect.hasAssertions()
    resetUseCases()

    await licenseWebhookHandlers.onOrderPaid(paidWith(fields))

    expect(useCaseMocks.grantLicense).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ withdrawalConsentAt: undefined }))
    expect(useCaseMocks.sendPurchaseConfirmationEmail).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ withdrawalConsent: false }),
    )
  })

  it("fails the delivery when the confirmation cannot be sent, after granting the licence, so Polar retries it", async () => {
    expect.hasAssertions()
    resetUseCases()
    const failure = new Error("Resend is unavailable")
    useCaseMocks.sendPurchaseConfirmationEmail.mockRejectedValueOnce(failure)

    await expect(licenseWebhookHandlers.onOrderPaid(orderPayload(env.POLAR_PRODUCT_ID_CORE, USER_ID))).rejects.toBe(failure)

    expect(useCaseMocks.grantLicense).toHaveBeenCalledOnce()
  })

  it.each([
    { order: "a product this app does not sell", payload: orderPayload(UNKNOWN_PRODUCT_ID, USER_ID) },
    { order: "no product and no buyer", payload: orderPayload() },
  ])("only logs an order for $order, without an alert", async ({ payload }) => {
    expect.hasAssertions()
    resetUseCases()
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

    await licenseWebhookHandlers.onOrderPaid(payload)

    expect(consoleError).toHaveBeenCalledExactlyOnceWith("[license] order ord_1 is not for a licence product")
    expect(useCaseMocks.grantLicense).not.toHaveBeenCalled()
    expect(useCaseMocks.sendPurchaseConfirmationEmail).not.toHaveBeenCalled()
    expect(useCaseMocks.sendUnmatchedOrderAlert).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })
})

describe("license webhooks on paid orders that match no account", () => {
  it("logs the order and alerts the site's contact address, granting nothing", async () => {
    expect.hasAssertions()
    resetUseCases()
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    const paid = guestOrder()

    await licenseWebhookHandlers.onOrderPaid({ data: paid })

    expect(consoleError).toHaveBeenCalledExactlyOnceWith(`[license] paid order ${paid.id} maps to no account`)
    expect(useCaseMocks.sendUnmatchedOrderAlert).toHaveBeenCalledExactlyOnceWith({ order: paid, tier: LICENSE_TIER.AGENCY })
    expect(useCaseMocks.grantLicense).not.toHaveBeenCalled()
    expect(useCaseMocks.sendPurchaseConfirmationEmail).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it("fails the delivery when the alert cannot be sent, so Polar retries it", async () => {
    expect.hasAssertions()
    resetUseCases()
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    const failure = new Error("Resend is unavailable")
    useCaseMocks.sendUnmatchedOrderAlert.mockRejectedValueOnce(failure)

    await expect(licenseWebhookHandlers.onOrderPaid({ data: guestOrder() })).rejects.toBe(failure)

    expect(useCaseMocks.grantLicense).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it("grants the licence from a redelivered event once the Polar customer is linked to an account", async () => {
    expect.hasAssertions()
    resetUseCases()
    const paid = guestOrder()
    setPolarCustomerExternalId(paid.customer_id, USER_ID)

    await licenseWebhookHandlers.onOrderPaid({ data: paid })

    expect(paid.customer.external_id).toBeNull()
    expect(useCaseMocks.grantLicense).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ polarOrderId: paid.id, tier: LICENSE_TIER.AGENCY, userId: USER_ID }),
    )
    expect(useCaseMocks.sendPurchaseConfirmationEmail).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ order: paid, recipient: BUYER_EMAIL, tier: LICENSE_TIER.AGENCY }),
    )
    expect(useCaseMocks.sendUnmatchedOrderAlert).not.toHaveBeenCalled()
  })
})

describe("license webhooks on keys, refunds and revocations", () => {
  it("attaches a key from a license benefit grant", async () => {
    expect.hasAssertions()
    resetUseCases()

    await licenseWebhookHandlers.onBenefitGrantCreated(grantPayload(LICENSE_KEY_GRANT, USER_ID))

    expect(useCaseMocks.attachLicenseKey).toHaveBeenCalledWith({ polarLicenseKeyId: "lk_1", polarOrderId: "ord_1", userId: USER_ID })
  })

  it("ignores a grant for a benefit that carries no license key", async () => {
    expect.hasAssertions()
    resetUseCases()

    await licenseWebhookHandlers.onBenefitGrantCreated(grantPayload({}, USER_ID))

    expect(useCaseMocks.attachLicenseKey).not.toHaveBeenCalled()
  })

  it("logs a license grant it cannot tie to a buyer", async () => {
    expect.hasAssertions()
    resetUseCases()
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    const grant = grantPolarLicenseKey(guestOrder())

    await licenseWebhookHandlers.onBenefitGrantCreated({ data: grant })

    expect(consoleError).toHaveBeenCalledExactlyOnceWith(`[license] benefit grant ${grant.id} does not belong to a known account`)
    expect(useCaseMocks.attachLicenseKey).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it("attaches the key from a redelivered grant once the Polar customer is linked to an account", async () => {
    expect.hasAssertions()
    resetUseCases()
    const paid = guestOrder()
    const grant = grantPolarLicenseKey(paid)
    setPolarCustomerExternalId(paid.customer_id, USER_ID)

    await licenseWebhookHandlers.onBenefitGrantCreated({ data: grant })

    expect(grant.customer.external_id).toBeNull()
    expect(useCaseMocks.attachLicenseKey).toHaveBeenCalledExactlyOnceWith({
      polarLicenseKeyId: grant.properties.license_key_id,
      polarOrderId: paid.id,
      userId: USER_ID,
    })
  })

  it("marks a fully refunded order refunded and a revoked grant revoked", async () => {
    expect.hasAssertions()
    resetUseCases()

    await licenseWebhookHandlers.onOrderRefunded(orderPayload(env.POLAR_PRODUCT_ID_CORE, USER_ID, POLAR_ORDER_STATUS.REFUNDED))
    await licenseWebhookHandlers.onBenefitGrantRevoked(grantPayload(LICENSE_KEY_GRANT, USER_ID))

    expect(useCaseMocks.revokeLicense.mock.calls).toStrictEqual([
      [{ polarOrderId: "ord_1", status: LICENSE_STATUS.REFUNDED, userId: USER_ID }],
      [{ polarOrderId: "ord_1", status: LICENSE_STATUS.REVOKED, userId: USER_ID }],
    ])
  })

  it("keeps the license when an order is only partially refunded", async () => {
    expect.hasAssertions()
    resetUseCases()

    await licenseWebhookHandlers.onOrderRefunded(orderPayload(env.POLAR_PRODUCT_ID_CORE, USER_ID, POLAR_ORDER_STATUS.PARTIALLY_REFUNDED))

    expect(useCaseMocks.revokeLicense).not.toHaveBeenCalled()
  })

  it("leaves anonymous revocations alone", async () => {
    expect.hasAssertions()
    resetUseCases()

    await licenseWebhookHandlers.onOrderRefunded(orderPayload(env.POLAR_PRODUCT_ID_CORE, undefined, POLAR_ORDER_STATUS.REFUNDED))
    await licenseWebhookHandlers.onBenefitGrantRevoked(grantPayload(LICENSE_KEY_GRANT))

    expect(useCaseMocks.revokeLicense).not.toHaveBeenCalled()
  })

  it("alerts about a paid order of an account that no longer exists and acknowledges its other events without touching licenses", async () => {
    expect.hasAssertions()
    resetUseCases()
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    const paid = createPolarOrder({ externalCustomerId: DELETED_USER_ID, productId: env.POLAR_PRODUCT_ID_CORE })
    const grant = grantPolarLicenseKey(paid)

    await licenseWebhookHandlers.onOrderPaid({ data: paid })
    await licenseWebhookHandlers.onBenefitGrantCreated({ data: grant })
    await licenseWebhookHandlers.onOrderRefunded({ data: { ...paid, status: POLAR_ORDER_STATUS.REFUNDED } })
    await licenseWebhookHandlers.onBenefitGrantRevoked({ data: grant })

    expect(useCaseMocks.sendUnmatchedOrderAlert).toHaveBeenCalledExactlyOnceWith({ order: paid, tier: LICENSE_TIER.CORE })
    expect(useCaseMocks.grantLicense).not.toHaveBeenCalled()
    expect(useCaseMocks.sendPurchaseConfirmationEmail).not.toHaveBeenCalled()
    expect(useCaseMocks.attachLicenseKey).not.toHaveBeenCalled()
    expect(useCaseMocks.revokeLicense).not.toHaveBeenCalled()
    expect(consoleError.mock.calls).toStrictEqual([
      [`[license] paid order ${paid.id} maps to no account`],
      [`[license] benefit grant ${grant.id} does not belong to a known account`],
    ])
    consoleError.mockRestore()
  })
})
