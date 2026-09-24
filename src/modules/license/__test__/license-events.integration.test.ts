import { env } from "cloudflare:workers"

import { beforeEach, describe, expect, it } from "vite-plus/test"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { licenseWebhookHandlers } from "~/src/modules/license/license.webhooks"
import { getLicense } from "~/src/modules/license/use-cases/get-license"
import { user } from "~/src/modules/user/user.schema"

const USER_ID = "license-event-owner"
const order = (id: string, createdAt: string, productId = env.POLAR_PRODUCT_ID_CORE) => ({
  data: { createdAt: new Date(createdAt), customer: { externalId: USER_ID }, customerId: "cus_1", id, productId },
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
    await licenseWebhookHandlers.onOrderRefunded(order("unrelated", "2026-09-24T10:00:00Z", "unrelated-product"))
    await licenseWebhookHandlers.onBenefitGrantRevoked({
      data: { customer: { externalId: USER_ID }, id: "unrelated", orderId: "unrelated", properties: {} },
    })

    expect(await getLicense(USER_ID)).toMatchObject({ polarOrderId: "original", status: "active" })
  })

  it("does not revoke an upgrade when the original order is refunded", async () => {
    await licenseWebhookHandlers.onOrderPaid(original)
    await licenseWebhookHandlers.onOrderPaid(upgrade)
    await licenseWebhookHandlers.onOrderRefunded(original)

    expect(await getLicense(USER_ID)).toMatchObject({ polarOrderId: "upgrade", status: "active", tier: "complete" })
  })

  it("does not reactivate a refunded purchase when its paid event is retried", async () => {
    await licenseWebhookHandlers.onOrderPaid(original)
    await licenseWebhookHandlers.onOrderRefunded(original)
    await licenseWebhookHandlers.onOrderPaid(original)

    expect(await getLicense(USER_ID)).toMatchObject({ status: "revoked" })
  })

  it("remembers a refund delivered before the paid event", async () => {
    const refunded = order("refund-first", "2026-09-24T12:00:00Z")
    await licenseWebhookHandlers.onOrderRefunded(refunded)
    await licenseWebhookHandlers.onOrderPaid(refunded)

    expect(await getLicense(USER_ID)).toBeUndefined()
  })

  it("does not replace a newer purchase with a delayed older paid event", async () => {
    await licenseWebhookHandlers.onOrderPaid(upgrade)
    await licenseWebhookHandlers.onOrderPaid(original)

    expect(await getLicense(USER_ID)).toMatchObject({ polarOrderId: "upgrade", tier: "complete" })
  })
})
