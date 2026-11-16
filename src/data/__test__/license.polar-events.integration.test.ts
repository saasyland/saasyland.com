import { env } from "cloudflare:workers"

import { eq } from "drizzle-orm"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { signedPolarWebhook } from "~/src/platform/testing/lib/polar"
import { TEST_APP_URL } from "~/src/platform/testing/lib/test-request"
import { createPolarOrder } from "~/src/platform/testing/mocks/polar"
import { getSentEmails } from "~/src/platform/testing/mocks/resend"

import { signUpAndVerify } from "~/src/integrations/better-auth/__test__/fixtures/auth.harness"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { POLAR_ORDER_STATUS } from "~/src/integrations/polar/polar.constants"
import { EMAIL_PURPOSE } from "~/src/integrations/resend/resend.constants"

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"
import { LICENSE_STATUS, LICENSE_TIER, LICENSE_WEBHOOK_EVENTS } from "~/src/modules/license/license.constants"
import { license } from "~/src/modules/license/license.schema"
import { POLAR_PRODUCT_IDS } from "~/src/modules/license/license.utils"
import { order } from "~/src/modules/order/order.schema"
import { recordOrder } from "~/src/modules/order/use-cases/record-order"

import { ROUTES } from "~/src/routes"

vi.mock(import("~/src/modules/order/use-cases/record-order"), async (importOriginal) => {
  const actual = await importOriginal()
  return { recordOrder: vi.fn(actual.recordOrder) }
})

const WEBHOOKS_URL = new URL(`${ROUTES.API_AUTH_BASE}${ROUTES.API_AUTH_POLAR.WEBHOOKS}`, TEST_APP_URL)

const post = async ({ body, headers }: ReturnType<typeof signedPolarWebhook>): Promise<number> => {
  const response = await auth.handler(new Request(WEBHOOKS_URL, { body, headers, method: "POST" }))
  return response.status
}

const paidLicenseOrder = async () => {
  const buyer = await signUpAndVerify()
  const paid = createPolarOrder({ externalCustomerId: buyer.userId, productId: POLAR_PRODUCT_IDS[LICENSE_TIER.COMPLETE] })
  const delivery = signedPolarWebhook({ data: paid, secret: env.POLAR_WEBHOOK_SECRET, type: LICENSE_WEBHOOK_EVENTS.onOrderPaid })
  return { buyer, delivery, paid }
}

const licencesOf = (userId: string) => db.select().from(license).where(eq(license.userId, userId))

const copiesOf = (userId: string) => db.select().from(order).where(eq(order.userId, userId))

const confirmationsTo = (recipient: string) =>
  getSentEmails(recipient).filter(({ idempotencyKey }) => idempotencyKey?.startsWith(`${EMAIL_PURPOSE.PURCHASE_CONFIRMATION}/`) === true)

afterEach(() => {
  vi.restoreAllMocks()
})

describe("one paid licence order for the licence and the billing area", () => {
  it("grants the licence and copies the order from a single order.paid", async () => {
    const { buyer, delivery, paid } = await paidLicenseOrder()

    expect(await post(delivery)).toBe(HTTP_STATUS.OK)

    await expect(licencesOf(buyer.userId)).resolves.toMatchObject([
      { polarOrderId: paid.id, status: LICENSE_STATUS.ACTIVE, tier: LICENSE_TIER.COMPLETE },
    ])
    await expect(copiesOf(buyer.userId)).resolves.toMatchObject([
      { id: paid.id, productId: POLAR_PRODUCT_IDS[LICENSE_TIER.COMPLETE], status: POLAR_ORDER_STATUS.PAID },
    ])
  })

  it("answers 500 when the copy fails, so Polar delivers the event again, and every delivery after it leaves one licence and one copy", async () => {
    const { buyer, delivery, paid } = await paidLicenseOrder()
    vi.mocked(recordOrder).mockRejectedValueOnce(new Error("D1 is unavailable"))
    vi.spyOn(console, "error").mockImplementation(() => {})

    expect(await post(delivery)).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    await expect(copiesOf(buyer.userId)).resolves.toStrictEqual([])

    expect(await post(delivery)).toBe(HTTP_STATUS.OK)
    const [granted] = await licencesOf(buyer.userId)
    const [copied] = await copiesOf(buyer.userId)
    expect(granted).toMatchObject({ polarOrderId: paid.id, status: LICENSE_STATUS.ACTIVE, tier: LICENSE_TIER.COMPLETE })
    expect(copied).toMatchObject({ id: paid.id, status: POLAR_ORDER_STATUS.PAID })

    expect(await post(delivery)).toBe(HTTP_STATUS.OK)
    await expect(licencesOf(buyer.userId)).resolves.toStrictEqual([granted])
    const copies = await copiesOf(buyer.userId)
    expect(copies).toStrictEqual([{ ...copied, updatedAt: copies[0]?.updatedAt }])
    expect(confirmationsTo(buyer.account.email)).toHaveLength(1)
  })
})
