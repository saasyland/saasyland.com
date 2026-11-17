import { env } from "cloudflare:workers"

import type { models } from "@polar-sh/sdk/2026-10"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { JSON_NULL } from "~/src/platform/testing/lib/json-null"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { POLAR_ORDER_STATUS } from "~/src/integrations/polar/polar.constants"

import { LICENSE_CHECKOUT_FIELD, LICENSE_STATUS, LICENSE_TIER } from "~/src/modules/license/license.constants"
import { licenseWebhookHandlers } from "~/src/modules/license/license.webhooks"
import type { attachLicenseKey } from "~/src/modules/license/use-cases/attach-license-key"
import type { grantLicense } from "~/src/modules/license/use-cases/grant-license"
import type { revokeLicense } from "~/src/modules/license/use-cases/revoke-license"
import type { sendPurchaseConfirmationEmail } from "~/src/modules/license/use-cases/send-purchase-confirmation-email"
import { user } from "~/src/modules/user/user.schema"

const USER_ID = "018f2b9c-0000-7000-8000-000000000005"
const UNKNOWN_PRODUCT_ID = "00000000-0000-4000-8000-00000000ffff"
const DELETED_USER_ID = "018f2b9c-0000-7000-8000-0000000000de"
const ORDERED_AT = "2026-09-24T10:00:00.000Z"
const BUYER_EMAIL = "buyer@example.test"

const useCaseMocks = vi.hoisted(() => ({
  attachLicenseKey: vi.fn<typeof attachLicenseKey>(),
  grantLicense: vi.fn<typeof grantLicense>(),
  revokeLicense: vi.fn<typeof revokeLicense>(),
  sendPurchaseConfirmationEmail: vi.fn<typeof sendPurchaseConfirmationEmail>(),
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

const orderPayload = (productId: string | null = JSON_NULL, externalId?: string, status: models.OrderStatus = POLAR_ORDER_STATUS.PAID) => ({
  data: {
    created_at: ORDERED_AT,
    currency: "usd",
    customer: { external_id: externalId },
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
}

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

  it("refuses an order for a product this app does not sell", async () => {
    expect.hasAssertions()
    resetUseCases()
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

    await licenseWebhookHandlers.onOrderPaid(orderPayload(UNKNOWN_PRODUCT_ID, USER_ID))

    expect(useCaseMocks.grantLicense).not.toHaveBeenCalled()
    expect(useCaseMocks.sendPurchaseConfirmationEmail).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it("refuses an order with no product and no buyer", async () => {
    expect.hasAssertions()
    resetUseCases()
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

    await licenseWebhookHandlers.onOrderPaid(orderPayload())

    expect(useCaseMocks.grantLicense).not.toHaveBeenCalled()
    consoleError.mockRestore()
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

    await licenseWebhookHandlers.onBenefitGrantCreated(grantPayload(LICENSE_KEY_GRANT))

    expect(useCaseMocks.attachLicenseKey).not.toHaveBeenCalled()
    consoleError.mockRestore()
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

  it("acknowledges every event for an account that no longer exists without touching licenses", async () => {
    expect.hasAssertions()
    resetUseCases()
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

    await licenseWebhookHandlers.onOrderPaid(orderPayload(env.POLAR_PRODUCT_ID_CORE, DELETED_USER_ID))
    await licenseWebhookHandlers.onBenefitGrantCreated(grantPayload(LICENSE_KEY_GRANT, DELETED_USER_ID))
    await licenseWebhookHandlers.onOrderRefunded(orderPayload(env.POLAR_PRODUCT_ID_CORE, DELETED_USER_ID, POLAR_ORDER_STATUS.REFUNDED))
    await licenseWebhookHandlers.onBenefitGrantRevoked(grantPayload(LICENSE_KEY_GRANT, DELETED_USER_ID))

    expect(useCaseMocks.grantLicense).not.toHaveBeenCalled()
    expect(useCaseMocks.sendPurchaseConfirmationEmail).not.toHaveBeenCalled()
    expect(useCaseMocks.attachLicenseKey).not.toHaveBeenCalled()
    expect(useCaseMocks.revokeLicense).not.toHaveBeenCalled()
    expect(consoleError).toHaveBeenCalledWith("[license] order ord_1 does not map to a known account and tier")
    expect(consoleError).toHaveBeenCalledWith("[license] benefit grant grant_1 does not belong to a known account")
    consoleError.mockRestore()
  })
})
