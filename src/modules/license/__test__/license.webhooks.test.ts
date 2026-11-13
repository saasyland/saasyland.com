import { env } from "cloudflare:workers"

import type { models } from "@polar-sh/sdk/2026-10"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { JSON_NULL } from "~/src/platform/testing/lib/json-null"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { POLAR_ORDER_STATUS } from "~/src/integrations/polar/polar.constants"

import { LICENSE_TIER } from "~/src/modules/license/license.constants"
import { licenseWebhookHandlers } from "~/src/modules/license/license.webhooks"
import type { attachLicenseKey } from "~/src/modules/license/use-cases/attach-license-key"
import type { grantLicense } from "~/src/modules/license/use-cases/grant-license"
import type { revokeLicense } from "~/src/modules/license/use-cases/revoke-license"
import { user } from "~/src/modules/user/user.schema"

const USER_ID = "018f2b9c-0000-7000-8000-000000000005"
const UNKNOWN_PRODUCT_ID = "00000000-0000-4000-8000-00000000ffff"
const DELETED_USER_ID = "018f2b9c-0000-7000-8000-0000000000de"

const useCaseMocks = vi.hoisted(() => ({
  attachLicenseKey: vi.fn<typeof attachLicenseKey>(),
  grantLicense: vi.fn<typeof grantLicense>(),
  revokeLicense: vi.fn<typeof revokeLicense>(),
}))

vi.mock(import("@tanstack/react-start/server-only"), () => ({}))

vi.mock(import("~/src/modules/license/use-cases/attach-license-key"), () => ({
  attachLicenseKey: useCaseMocks.attachLicenseKey,
}))

vi.mock(import("~/src/modules/license/use-cases/grant-license"), () => ({ grantLicense: useCaseMocks.grantLicense }))

vi.mock(import("~/src/modules/license/use-cases/revoke-license"), () => ({ revokeLicense: useCaseMocks.revokeLicense }))

const orderPayload = (productId: string | null = JSON_NULL, externalId?: string, status: models.OrderStatus = POLAR_ORDER_STATUS.PAID) => ({
  data: {
    created_at: "2026-09-24T10:00:00.000Z",
    customer: { external_id: externalId },
    customer_id: "cus_1",
    id: "ord_1",
    product_id: productId,
    status,
  },
})

const LICENSE_KEY_GRANT = { license_key_id: "lk_1" }

const grantPayload = (properties: models.BenefitGrantWebhook["properties"], externalId?: string) => ({
  data: { customer: { external_id: externalId }, id: "grant_1", order_id: "ord_1", properties },
})

const resetUseCases = (): void => {
  useCaseMocks.attachLicenseKey.mockClear()
  useCaseMocks.grantLicense.mockClear()
  useCaseMocks.revokeLicense.mockClear()
}

beforeEach(async () => {
  await db.delete(user)
  await db.insert(user).values({ email: "buyer@example.test", id: USER_ID, name: "Buyer" })
})

describe("license webhooks", () => {
  it("grants the tier the buyer paid for", async () => {
    expect.hasAssertions()
    resetUseCases()

    await licenseWebhookHandlers.onOrderPaid(orderPayload(env.POLAR_PRODUCT_ID_COMPLETE, USER_ID))

    expect(useCaseMocks.grantLicense).toHaveBeenCalledWith({
      polarCustomerId: "cus_1",
      polarOrderId: "ord_1",
      purchaseCreatedAt: new Date("2026-09-24T10:00:00Z"),
      tier: LICENSE_TIER.COMPLETE,
      userId: USER_ID,
    })
  })

  it("refuses an order for a product this app does not sell", async () => {
    expect.hasAssertions()
    resetUseCases()
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

    await licenseWebhookHandlers.onOrderPaid(orderPayload(UNKNOWN_PRODUCT_ID, USER_ID))

    expect(useCaseMocks.grantLicense).not.toHaveBeenCalled()
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

  it("revokes on a full refund and on a revoked grant", async () => {
    expect.hasAssertions()
    resetUseCases()
    const REVOCATIONS = 2

    await licenseWebhookHandlers.onOrderRefunded(orderPayload(env.POLAR_PRODUCT_ID_CORE, USER_ID, POLAR_ORDER_STATUS.REFUNDED))
    await licenseWebhookHandlers.onBenefitGrantRevoked(grantPayload(LICENSE_KEY_GRANT, USER_ID))

    expect(useCaseMocks.revokeLicense).toHaveBeenCalledTimes(REVOCATIONS)
    expect(useCaseMocks.revokeLicense).toHaveBeenCalledWith({ polarOrderId: "ord_1", userId: USER_ID })
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
    expect(useCaseMocks.attachLicenseKey).not.toHaveBeenCalled()
    expect(useCaseMocks.revokeLicense).not.toHaveBeenCalled()
    expect(consoleError).toHaveBeenCalledWith("[license] order ord_1 does not map to a known account and tier")
    expect(consoleError).toHaveBeenCalledWith("[license] benefit grant grant_1 does not belong to a known account")
    consoleError.mockRestore()
  })
})
