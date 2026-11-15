import { readFileSync } from "node:fs"
import { parseEnv } from "node:util"

import type { APIRequestContext } from "@playwright/test"
import type { models } from "@polar-sh/sdk/2026-10"
import * as zod from "zod"

import { licensePolarProduct } from "../../src/modules/license/__test__/fixtures/polar-product"
import { LICENSE_TIER, LICENSE_WEBHOOK_EVENTS, type LicenseTier } from "../../src/modules/license/license.constants"
import { polarCustomer, polarOrder, signedPolarWebhook } from "../../src/platform/testing/lib/polar"
import { ROUTES } from "../../src/routes"
import { expect } from "./test"

const testEnvSchema = zod.object({
  POLAR_ORGANIZATION_ID: zod.string(),
  POLAR_PRODUCT_ID_AGENCY: zod.string(),
  POLAR_PRODUCT_ID_COMPLETE: zod.string(),
  POLAR_PRODUCT_ID_CORE: zod.string(),
  POLAR_WEBHOOK_SECRET: zod.string(),
})

const TEST_ENV = testEnvSchema.parse(parseEnv(readFileSync(new URL("../../.env.test", import.meta.url), "utf8")))

const PAID: models.OrderStatus = "paid"

const PRODUCT_IDS: Readonly<Record<LicenseTier, string>> = {
  [LICENSE_TIER.AGENCY]: TEST_ENV.POLAR_PRODUCT_ID_AGENCY,
  [LICENSE_TIER.COMPLETE]: TEST_ENV.POLAR_PRODUCT_ID_COMPLETE,
  [LICENSE_TIER.CORE]: TEST_ENV.POLAR_PRODUCT_ID_CORE,
}

export const deliverPaidOrder = async (request: APIRequestContext, { tier, userId }: { tier: LicenseTier; userId: string }) => {
  const order = polarOrder({
    checkoutId: null,
    customer: polarCustomer(TEST_ENV.POLAR_ORGANIZATION_ID, userId),
    discount: null,
    metadata: {},
    product: licensePolarProduct(tier, PRODUCT_IDS[tier]),
    status: PAID,
  })
  const { body, headers } = signedPolarWebhook({ data: order, secret: TEST_ENV.POLAR_WEBHOOK_SECRET, type: LICENSE_WEBHOOK_EVENTS.onOrderPaid })

  const response = await request.post(`${ROUTES.API_AUTH_BASE}${ROUTES.API_AUTH_POLAR.WEBHOOKS}`, { data: body, headers })
  expect(response.ok()).toBe(true)
}
