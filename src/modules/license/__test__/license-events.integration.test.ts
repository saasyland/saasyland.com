import { env } from "cloudflare:workers"

import type { models } from "@polar-sh/sdk/2026-10"
import { eq } from "drizzle-orm"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { POLAR_ORDER_STATUS } from "~/src/integrations/polar/polar.constants"

import { LICENSE_STATUS, LICENSE_TIER } from "~/src/modules/license/license.constants"
import { licenseWebhookHandlers } from "~/src/modules/license/license.webhooks"
import { getLicense } from "~/src/modules/license/use-cases/get-license"
import { user } from "~/src/modules/user/user.schema"

const USER_ID = "license-event-owner"
const order = (id: string, createdAt: string, productId = env.POLAR_PRODUCT_ID_CORE) => ({
  data: {
    created_at: createdAt,
    customer: { external_id: USER_ID },
    customer_id: "cus_1",
    id,
    product_id: productId,
    status: POLAR_ORDER_STATUS.PAID,
  },
})
const refund = ({ data }: ReturnType<typeof order>, status: models.OrderStatus = POLAR_ORDER_STATUS.REFUNDED) => ({
  data: { ...data, status },
})
const licenseKeyGrant = (orderId: string) => ({
  data: { customer: { external_id: USER_ID }, id: `grant-${orderId}`, order_id: orderId, properties: { license_key_id: `lk-${orderId}` } },
})
const original = order("original", "2026-09-23T10:00:00Z")
const upgrade = order("upgrade", "2026-09-24T10:00:00Z", env.POLAR_PRODUCT_ID_COMPLETE)

beforeEach(async () => {
  await db.delete(user)
  await db.insert(user).values({ email: "license-events@example.test", id: USER_ID, name: "Buyer" })
})

describe("license event identity and ordering", () => {
  it("preserves the current purchase after unrelated refunds and benefit revocations", async () => {
    await licenseWebhookHandlers.onOrderPaid(original)
    await licenseWebhookHandlers.onOrderRefunded(refund(order("unrelated", "2026-09-24T10:00:00Z", "unrelated-product")))
    await licenseWebhookHandlers.onBenefitGrantRevoked({
      data: { customer: { external_id: USER_ID }, id: "unrelated", order_id: "unrelated", properties: {} },
    })

    expect(await getLicense(USER_ID)).toMatchObject({ polarOrderId: "original", status: LICENSE_STATUS.ACTIVE })
  })

  it("does not revoke an upgrade when the original order is refunded", async () => {
    await licenseWebhookHandlers.onOrderPaid(original)
    await licenseWebhookHandlers.onOrderPaid(upgrade)
    await licenseWebhookHandlers.onOrderRefunded(refund(original))

    expect(await getLicense(USER_ID)).toMatchObject({ polarOrderId: "upgrade", status: LICENSE_STATUS.ACTIVE, tier: LICENSE_TIER.COMPLETE })
  })

  it("does not reactivate a refunded purchase when its paid event is retried", async () => {
    await licenseWebhookHandlers.onOrderPaid(original)
    await licenseWebhookHandlers.onOrderRefunded(refund(original))
    await licenseWebhookHandlers.onOrderPaid(original)

    expect(await getLicense(USER_ID)).toMatchObject({ status: LICENSE_STATUS.REVOKED })
  })

  it("remembers a refund delivered before the paid event", async () => {
    const refunded = order("refund-first", "2026-09-24T12:00:00Z")
    await licenseWebhookHandlers.onOrderRefunded(refund(refunded))
    await licenseWebhookHandlers.onOrderPaid(refunded)

    expect(await getLicense(USER_ID)).toBeUndefined()
  })

  it("does not replace a newer purchase with a delayed older paid event", async () => {
    await licenseWebhookHandlers.onOrderPaid(upgrade)
    await licenseWebhookHandlers.onOrderPaid(original)

    expect(await getLicense(USER_ID)).toMatchObject({ polarOrderId: "upgrade", tier: LICENSE_TIER.COMPLETE })
  })

  it("keeps the license active when its order is only partially refunded", async () => {
    await licenseWebhookHandlers.onOrderPaid(original)
    await licenseWebhookHandlers.onOrderRefunded(refund(original, POLAR_ORDER_STATUS.PARTIALLY_REFUNDED))

    expect(await getLicense(USER_ID)).toMatchObject({ polarOrderId: "original", status: LICENSE_STATUS.ACTIVE })
  })

  it("revokes the license once a partially refunded order is refunded in full", async () => {
    await licenseWebhookHandlers.onOrderPaid(original)
    await licenseWebhookHandlers.onOrderRefunded(refund(original, POLAR_ORDER_STATUS.PARTIALLY_REFUNDED))
    await licenseWebhookHandlers.onOrderRefunded(refund(original))

    expect(await getLicense(USER_ID)).toMatchObject({ polarOrderId: "original", status: LICENSE_STATUS.REVOKED })
  })

  it("acknowledges the key of a purchase refunded before it was recorded instead of asking for retries", async () => {
    const refunded = order("refund-before-key", "2026-09-24T12:00:00Z")
    await licenseWebhookHandlers.onOrderRefunded(refund(refunded))
    await licenseWebhookHandlers.onOrderPaid(refunded)

    await expect(licenseWebhookHandlers.onBenefitGrantCreated(licenseKeyGrant("refund-before-key"))).resolves.toBeUndefined()
    expect(await getLicense(USER_ID)).toBeUndefined()
  })

  it("acknowledges refunds and revocations for an account deleted after its purchase", async () => {
    await licenseWebhookHandlers.onOrderPaid(original)
    await db.delete(user).where(eq(user.id, USER_ID))
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

    await expect(licenseWebhookHandlers.onOrderRefunded(refund(original))).resolves.toBeUndefined()
    await expect(licenseWebhookHandlers.onBenefitGrantRevoked(licenseKeyGrant("original"))).resolves.toBeUndefined()
    await expect(licenseWebhookHandlers.onOrderPaid(upgrade)).resolves.toBeUndefined()

    expect(await getLicense(USER_ID)).toBeUndefined()
    expect(consoleError).toHaveBeenCalledWith("[license] order upgrade does not map to a known account and tier")
    consoleError.mockRestore()
  })
})
