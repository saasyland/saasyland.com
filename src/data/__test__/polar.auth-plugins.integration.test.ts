import { env } from "cloudflare:workers"

import { checkout } from "@polar-sh/better-auth"
import type { models } from "@polar-sh/sdk/2026-10"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { JSON_NULL } from "~/src/platform/testing/lib/json-null"
import { type PolarProduct, polarCustomer, polarOrder, signedPolarWebhook } from "~/src/platform/testing/lib/polar"
import { TEST_APP_URL } from "~/src/platform/testing/lib/test-request"

import { browserHeaders, postJson, signUpSignedIn } from "~/src/integrations/better-auth/__test__/fixtures/auth.harness"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { polarCore } from "~/src/integrations/polar/polar.config"
import { POLAR_ORDER_STATUS, POLAR_WEBHOOK_EVENT } from "~/src/integrations/polar/polar.constants"

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"

import type { PolarEventHandler } from "~/src/data/polar-events"
import { POLAR_AUTH_PLUGINS } from "~/src/data/polar.auth-plugins"
import { DEFAULT_CURRENCY_CODE } from "~/src/data/pricing"

import * as ROUTES from "~/src/routes"

const sample = vi.hoisted(() => ({ handle: vi.fn<PolarEventHandler["handle"]>() }))

vi.mock("~/src/data/polar-events.entries", async () => {
  const { POLAR_WEBHOOK_EVENT: EVENT } = await import("~/src/integrations/polar/polar.constants")
  return { SAMPLE_POLAR_EVENTS: [{ events: [EVENT.ORDER_PAID], handle: sample.handle }] }
})

const WEBHOOKS_URL = new URL(`${ROUTES.API_AUTH_BASE}${ROUTES.API_AUTH_POLAR.WEBHOOKS}`, TEST_APP_URL)

const PRODUCT = {
  id: "product-sample",
  name: "Sample",
  price: { amount: 1000, currency: DEFAULT_CURRENCY_CODE },
  recurringInterval: JSON_NULL,
} as const satisfies PolarProduct

const portal = (headers: Headers) => auth.handler(new Request(new URL(ROUTES.API_AUTH_CUSTOMER_PORTAL, TEST_APP_URL), { headers }))

const deliver = async (type: models.WebhookEventType): Promise<number> => {
  const order = polarOrder({
    checkoutId: JSON_NULL,
    customer: polarCustomer(env.POLAR_ORGANIZATION_ID, "user-sample"),
    metadata: {},
    product: PRODUCT,
    status: POLAR_ORDER_STATUS.PAID,
  })
  const { body, headers } = signedPolarWebhook({ data: order, secret: env.POLAR_WEBHOOK_SECRET, type })
  const response = await auth.handler(new Request(WEBHOOKS_URL, { body, headers, method: "POST" }))

  return response.status
}

beforeEach(() => {
  sample.handle.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("the polar area's Polar plugin", () => {
  it("adds the Polar plugin to Better Auth", () => {
    expect(auth.options.plugins.map(({ id }) => id)).toContain(POLAR_AUTH_PLUGINS[0].plugin.id)
  })

  it("exempts the webhooks from rate limiting", () => {
    expect(auth.options.rateLimit.customRules).toHaveProperty([ROUTES.API_AUTH_POLAR.WEBHOOKS], false)
  })

  it("adds the portal and the webhooks but no checkout endpoint, so every checkout starts in the area that sells the product", () => {
    expect(auth.api).not.toHaveProperty("checkout")
    expect(auth.api).toHaveProperty("portal")
    expect(auth.api).toHaveProperty("polarWebhooks")
  })

  it("answers 404 at the path of the plugin's own checkout, which no disabled path closes any more, so adding checkout() to the plugin fails here", async () => {
    const checkoutPath = `${ROUTES.API_AUTH_BASE}${checkout()(polarCore).checkout.path}`

    const response = await auth.handler(postJson(checkoutPath, { products: PRODUCT.id }))

    expect(response.status).toBe(HTTP_STATUS.NOT_FOUND)
  })

  it("hands a signed event to the areas that handle it and acknowledges it", async () => {
    expect(await deliver(POLAR_WEBHOOK_EVENT.ORDER_PAID)).toBe(HTTP_STATUS.OK)
    expect(sample.handle).toHaveBeenCalledWith(expect.objectContaining({ type: POLAR_WEBHOOK_EVENT.ORDER_PAID }))
  })

  it("acknowledges an event no area handles without handing it on", async () => {
    expect(await deliver(POLAR_WEBHOOK_EVENT.ORDER_REFUNDED)).toBe(HTTP_STATUS.OK)
    expect(sample.handle).not.toHaveBeenCalled()
  })

  it("answers 500 when an area's handler fails, so Polar delivers the event again", async () => {
    sample.handle.mockRejectedValueOnce(new Error("mirror unavailable"))
    vi.spyOn(console, "error").mockImplementation(() => {})

    expect(await deliver(POLAR_WEBHOOK_EVENT.ORDER_PAID)).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
  })

  it("refuses the customer portal, which shows licence keys, to a customer whose email is not confirmed", async () => {
    const unconfirmed = await signUpSignedIn()

    const refused = await portal(unconfirmed.headers)
    expect(refused.status).toBe(HTTP_STATUS.FORBIDDEN)
    expect(await refused.json()).toMatchObject({ code: "EMAIL_NOT_VERIFIED" })
    const signedOut = await portal(browserHeaders())
    expect(signedOut.status).toBe(HTTP_STATUS.UNAUTHORIZED)
  })
})
