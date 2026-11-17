import { readFileSync } from "node:fs"
import { parseEnv } from "node:util"

import type { APIRequestContext, Locator, Page } from "@playwright/test"
import * as zod from "zod"

import { POLAR_ORDER_STATUS } from "../../src/integrations/polar/polar.constants"
import { licensePolarProduct } from "../../src/modules/license/__test__/fixtures/polar-product"
import {
  LICENSE_CHECKOUT_FIELD,
  LICENSE_TIER,
  LICENSE_WEBHOOK_EVENTS,
  type LicenseTier,
} from "../../src/modules/license/license.constants"
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

const PRODUCT_IDS: Readonly<Record<LicenseTier, string>> = {
  [LICENSE_TIER.AGENCY]: TEST_ENV.POLAR_PRODUCT_ID_AGENCY,
  [LICENSE_TIER.COMPLETE]: TEST_ENV.POLAR_PRODUCT_ID_COMPLETE,
  [LICENSE_TIER.CORE]: TEST_ENV.POLAR_PRODUCT_ID_CORE,
}

interface PaidOrder {
  readonly tier: LicenseTier
  readonly userId: string
  readonly withdrawalConsent?: boolean
}

export const deliverPaidOrder = async (request: APIRequestContext, { tier, userId, withdrawalConsent = false }: PaidOrder) => {
  const paid = polarOrder({
    checkoutId: null,
    customer: polarCustomer(TEST_ENV.POLAR_ORGANIZATION_ID, userId),
    discount: null,
    metadata: {},
    product: licensePolarProduct(tier, PRODUCT_IDS[tier]),
    status: POLAR_ORDER_STATUS.PAID,
  })
  const order = { ...paid, custom_field_data: { [LICENSE_CHECKOUT_FIELD.WITHDRAWAL_CONSENT]: withdrawalConsent } }
  const { body, headers } = signedPolarWebhook({ data: order, secret: TEST_ENV.POLAR_WEBHOOK_SECRET, type: LICENSE_WEBHOOK_EVENTS.onOrderPaid })

  const response = await request.post(`${ROUTES.API_AUTH_BASE}${ROUTES.API_AUTH_POLAR.WEBHOOKS}`, { data: body, headers })
  expect(response.ok()).toBe(true)
}

export const consentDialog = (page: Page): Locator => page.getByRole("dialog", { name: "Before you pay" })

export const consentAndPay = async (page: Page): Promise<void> => {
  const dialog = consentDialog(page)
  await dialog.getByText(/^I ask SaaSy Land to supply /u).click()
  await expect(dialog.getByRole("checkbox")).toBeChecked()
  await dialog.getByRole("button", { name: "Continue to payment" }).click()
}
