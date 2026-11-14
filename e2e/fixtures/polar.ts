import { readFileSync } from "node:fs"
import { parseEnv } from "node:util"

import type { APIRequestContext } from "@playwright/test"
import type { models } from "@polar-sh/sdk/2026-10"
import * as zod from "zod"

import { LICENSE_TIER, LICENSE_WEBHOOK_EVENTS, type LicenseTier } from "../../src/modules/license/license.constants"
import { type PolarCatalogue, polarCustomer, polarOrder, signedPolarWebhook } from "../../src/platform/testing/lib/polar"
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

const CATALOGUE: PolarCatalogue = {
  organizationId: TEST_ENV.POLAR_ORGANIZATION_ID,
  productIds: {
    [LICENSE_TIER.AGENCY]: TEST_ENV.POLAR_PRODUCT_ID_AGENCY,
    [LICENSE_TIER.COMPLETE]: TEST_ENV.POLAR_PRODUCT_ID_COMPLETE,
    [LICENSE_TIER.CORE]: TEST_ENV.POLAR_PRODUCT_ID_CORE,
  },
}

export const deliverPaidOrder = async (request: APIRequestContext, { tier, userId }: { tier: LicenseTier; userId: string }) => {
  const order = polarOrder({
    catalogue: CATALOGUE,
    checkoutId: null,
    customer: polarCustomer(CATALOGUE, userId),
    discount: null,
    metadata: {},
    status: PAID,
    tier,
  })
  const { body, headers } = signedPolarWebhook({ data: order, secret: TEST_ENV.POLAR_WEBHOOK_SECRET, type: LICENSE_WEBHOOK_EVENTS.onOrderPaid })

  const response = await request.post(`${ROUTES.API_AUTH_BASE}${ROUTES.API_AUTH.POLAR_WEBHOOKS}`, { data: body, headers })
  expect(response.ok()).toBe(true)
}
