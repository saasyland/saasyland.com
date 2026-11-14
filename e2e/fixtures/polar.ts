import { createHmac } from "node:crypto"
import { readFileSync } from "node:fs"
import { parseEnv } from "node:util"

import type { APIRequestContext } from "@playwright/test"
import type { models } from "@polar-sh/sdk/2026-10"
import * as zod from "zod"

import { LICENSE_TIER } from "../../src/modules/license/license.constants"
import { expect } from "./test"

const testEnvSchema = zod.object({
  POLAR_PRODUCT_ID_AGENCY: zod.string(),
  POLAR_PRODUCT_ID_COMPLETE: zod.string(),
  POLAR_PRODUCT_ID_CORE: zod.string(),
  POLAR_WEBHOOK_SECRET: zod.string(),
})

const TEST_ENV = testEnvSchema.parse(parseEnv(readFileSync(new URL("../../.env.test", import.meta.url), "utf8")))

const ORDER_PAID = { event: "order.paid", status: "paid" } as const satisfies { event: string; status: models.OrderStatus }

const PRODUCT_IDS = {
  [LICENSE_TIER.AGENCY]: TEST_ENV.POLAR_PRODUCT_ID_AGENCY,
  [LICENSE_TIER.COMPLETE]: TEST_ENV.POLAR_PRODUCT_ID_COMPLETE,
  [LICENSE_TIER.CORE]: TEST_ENV.POLAR_PRODUCT_ID_CORE,
} as const

const MILLISECONDS_PER_SECOND = 1000

const sign = ({ body, id, timestamp }: { body: string; id: string; timestamp: number }): string =>
  createHmac("sha256", TEST_ENV.POLAR_WEBHOOK_SECRET)
    .update(`${id}.${String(timestamp)}.${body}`)
    .digest("base64")

export const deliverPaidOrder = async (request: APIRequestContext, { tier, userId }: { tier: keyof typeof PRODUCT_IDS; userId: string }) => {
  const now = new Date()
  const id = `msg_${crypto.randomUUID()}`
  const timestamp = Math.floor(now.getTime() / MILLISECONDS_PER_SECOND)
  const body = JSON.stringify({
    data: {
      created_at: now.toISOString(),
      customer: { external_id: userId },
      customer_id: `cus_${userId}`,
      id: `ord_${crypto.randomUUID()}`,
      product_id: PRODUCT_IDS[tier],
      status: ORDER_PAID.status,
    },
    timestamp: now.toISOString(),
    type: ORDER_PAID.event,
  })

  const response = await request.post("/api/auth/polar/webhooks", {
    data: body,
    headers: {
      "content-type": "application/json",
      "webhook-id": id,
      "webhook-signature": `v1,${sign({ body, id, timestamp })}`,
      "webhook-timestamp": String(timestamp),
    },
  })
  expect(response.ok()).toBe(true)
}
