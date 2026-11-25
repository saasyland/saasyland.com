import { env } from "cloudflare:workers"

import { createElement } from "react"

import { beforeEach, describe, expect, it } from "vite-plus/test"

import type { PolarProduct } from "~/src/platform/testing/lib/polar"
import {
  POLAR_API,
  createPolarOrder,
  polarApi,
  polarCheckouts,
  revokePolarScope,
  seedPolarCatalogue,
} from "~/src/platform/testing/mocks/polar"
import { takeProviderRefusals } from "~/src/platform/testing/mocks/providers"
import { getSentEmails, resendApi } from "~/src/platform/testing/mocks/resend"

import { polar } from "~/src/integrations/polar/polar.config"
import {
  POLAR_FIXED_PRICE,
  POLAR_MINIMUM_PRICE_AMOUNT,
  POLAR_PAGE_SIZE,
  POLAR_PRICE_CURRENCY,
  POLAR_SCOPE,
} from "~/src/integrations/polar/polar.constants"
import { sendEmail } from "~/src/integrations/resend/resend.utils"

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"
import { DEFAULT_CURRENCY_CODE } from "~/src/modules/_core/constants/pricing"

const RESEND_EMAILS = `${resendApi.origin}/emails`
const POLAR_CHECKOUTS = `${polarApi.origin}${POLAR_API.CHECKOUTS}`

const STARTER_KIT: PolarProduct = {
  id: crypto.randomUUID(),
  name: "Starter kit",
  price: { amount: 4900, currency: DEFAULT_CURRENCY_CODE },
  recurringInterval: null,
}

const MONTHLY_PLAN: PolarProduct = {
  id: crypto.randomUUID(),
  name: "Monthly plan",
  price: { amount: 1900, currency: DEFAULT_CURRENCY_CODE },
  recurringInterval: "month",
}

const checkoutBody = (productId: string) => ({
  allow_discount_codes: false,
  customer_email: "ada@example.test",
  customer_ip_address: null,
  customer_name: "Ada Lovelace",
  external_customer_id: "customer",
  metadata: {},
  products: [productId],
  success_url: "http://localhost:3000/app",
})

const adHocPrice = (amount: number) => ({ amount_type: POLAR_FIXED_PRICE, price_amount: amount, price_currency: POLAR_PRICE_CURRENCY })

const post = (url: string, body: unknown, token: string): Promise<Response> =>
  fetch(url, {
    body: JSON.stringify(body),
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    method: "POST",
  })

describe("Resend test double", () => {
  it("delivers what the Resend SDK sends", async () => {
    const id = await sendEmail({
      idempotency: { purpose: "double", token: "token" },
      react: createElement("p", null, "Hello"),
      subject: "Hello",
      to: "ada@example.test",
    })

    expect(getSentEmails("ada@example.test")).toStrictEqual([
      expect.objectContaining({ from: env.RESEND_EMAIL_FROM, id, to: ["ada@example.test"] }),
    ])
    expect(takeProviderRefusals()).toStrictEqual([])
  })

  it.each([
    ["an invalid recipient", { from: env.RESEND_EMAIL_FROM, html: "<p>Hi</p>", subject: "Hi", to: "not-an-address" }],
    ["a missing subject", { from: env.RESEND_EMAIL_FROM, html: "<p>Hi</p>", to: "ada@example.test" }],
    [
      "a field Resend does not know",
      { from: env.RESEND_EMAIL_FROM, html: "<p>Hi</p>", subject: "Hi", to: "ada@example.test", tracking: true },
    ],
  ])("answers 422 to %s, delivers nothing and records the refusal", async (_case, body) => {
    const response = await post(RESEND_EMAILS, body, env.RESEND_API_KEY)

    expect(response.status).toBe(HTTP_STATUS.UNPROCESSABLE_CONTENT)
    await expect(response.json()).resolves.toMatchObject({ name: "validation_error" })
    expect(getSentEmails()).toStrictEqual([])
    expect(takeProviderRefusals()).toHaveLength(1)
  })

  it("answers 401 to a request without the configured API key", async () => {
    const response = await post(RESEND_EMAILS, {}, "re_wrong")

    expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    expect(takeProviderRefusals()).toHaveLength(1)
  })

  it("answers 409 when an idempotency key is reused for a different email", async () => {
    const email = { from: env.RESEND_EMAIL_FROM, html: "<p>Hi</p>", subject: "Hi", to: "ada@example.test" }
    const send = (subject: string) =>
      fetch(RESEND_EMAILS, {
        body: JSON.stringify({ ...email, subject }),
        headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "idempotency-key": "same-key" },
        method: "POST",
      })

    await expect(send("Hi")).resolves.toHaveProperty("status", HTTP_STATUS.OK)
    await expect(send("Hello")).resolves.toHaveProperty("status", HTTP_STATUS.CONFLICT)
    expect(getSentEmails()).toHaveLength(1)
    expect(takeProviderRefusals()).toHaveLength(1)
  })
})

describe("Polar test double", () => {
  beforeEach(() => {
    seedPolarCatalogue({ licenseKeyBenefits: [], products: [STARTER_KIT, MONTHLY_PLAN] })
  })

  it("serves an order through the Polar SDK", async () => {
    const order = createPolarOrder({ externalCustomerId: "customer", productId: STARTER_KIT.id })

    await expect(polar.orders.get(order.id)).resolves.toStrictEqual(order)
  })

  it("answers 404 for an order it does not hold, as Polar does, without refusing the request", async () => {
    await expect(polar.orders.get(crypto.randomUUID())).rejects.toThrow("ResourceNotFound")
    expect(takeProviderRefusals()).toStrictEqual([])
  })

  it("opens a checkout for a recurring product at its price, as Polar does for a subscription", async () => {
    const checkout = await polar.checkouts.create(checkoutBody(MONTHLY_PLAN.id))

    expect(checkout).toMatchObject({
      amount: MONTHLY_PLAN.price.amount,
      currency: MONTHLY_PLAN.price.currency.toLowerCase(),
      net_amount: MONTHLY_PLAN.price.amount,
      product: { is_recurring: true, recurring_interval: MONTHLY_PLAN.recurringInterval, recurring_interval_count: 1 },
      product_id: MONTHLY_PLAN.id,
    })
    expect(polarCheckouts()).toStrictEqual([checkout])
  })

  it("answers 422 to a checkout for a product the organization does not sell and records why", async () => {
    const productId = crypto.randomUUID()

    const response = await post(POLAR_CHECKOUTS, checkoutBody(productId), env.POLAR_ACCESS_TOKEN)

    expect(response.status).toBe(HTTP_STATUS.UNPROCESSABLE_CONTENT)
    expect(takeProviderRefusals()).toStrictEqual([
      `POST ${POLAR_CHECKOUTS}: body.products: ${productId} is not a product of the organization`,
    ])
    expect(polarCheckouts()).toStrictEqual([])
  })

  it("forgets the products a test seeded when it is reset", async () => {
    polarApi.reset()

    const response = await post(POLAR_CHECKOUTS, checkoutBody(MONTHLY_PLAN.id), env.POLAR_ACCESS_TOKEN)

    expect(response.status).toBe(HTTP_STATUS.UNPROCESSABLE_CONTENT)
    expect(takeProviderRefusals()).toHaveLength(1)
  })

  it.each([
    ["a checkout without the buyer's account", { external_customer_id: undefined }, "body"],
    ["a checkout with a field Polar does not know", { coupon: "LAUNCH" }, "body"],
    ["a checkout priced for a product it does not sell", { prices: { [MONTHLY_PLAN.id]: [adHocPrice(STARTER_KIT.price.amount)] } }, "body"],
    ["a checkout priced under Polar's minimum", { prices: { [STARTER_KIT.id]: [adHocPrice(POLAR_MINIMUM_PRICE_AMOUNT - 1)] } }, "body"],
  ])("answers 422 to %s and records the refusal", async (_case, change, location) => {
    const response = await post(POLAR_CHECKOUTS, { ...checkoutBody(STARTER_KIT.id), ...change }, env.POLAR_ACCESS_TOKEN)

    expect(response.status).toBe(HTTP_STATUS.UNPROCESSABLE_CONTENT)
    expect(takeProviderRefusals()).toStrictEqual([expect.stringContaining(`: ${location}: `)])
  })

  it("answers 401 to a request without the configured access token", async () => {
    const order = POLAR_API.ORDER.replace(":id", crypto.randomUUID())

    await expect(fetch(`${polarApi.origin}${order}`)).resolves.toHaveProperty("status", HTTP_STATUS.UNAUTHORIZED)
    expect(takeProviderRefusals()).toHaveLength(1)
  })

  it("answers 403 to a request that needs a scope the token lacks, as Polar does, and records the refusal", async () => {
    revokePolarScope(POLAR_SCOPE.PRODUCTS)

    await expect(polar.products.list({ limit: POLAR_PAGE_SIZE })).rejects.toThrow("insufficient_scope")
    expect(takeProviderRefusals()).toStrictEqual([expect.stringContaining(`: the token lacks the ${POLAR_SCOPE.PRODUCTS} scope`)])
  })

  it("answers 422 to a product listing with a query it does not expect", async () => {
    await expect(polar.products.list({ is_archived: false, limit: POLAR_PAGE_SIZE })).rejects.toThrow(
      `Polar API returned an error: ${String(HTTP_STATUS.UNPROCESSABLE_CONTENT)}`,
    )
    expect(takeProviderRefusals()).toStrictEqual([expect.stringContaining(": query: ")])
  })

  it("refuses an endpoint the application never calls", async () => {
    const response = await fetch(`${polarApi.origin}${POLAR_API.PRODUCTS}`, {
      body: JSON.stringify({ name: "Unused" }),
      headers: { authorization: `Bearer ${env.POLAR_ACCESS_TOKEN}` },
      method: "POST",
    })

    expect(response.status).toBe(HTTP_STATUS.NOT_FOUND)
    expect(takeProviderRefusals()).toHaveLength(1)
  })
})

describe("outbound requests", () => {
  it("fail like an offline network for any origin no provider double serves", async () => {
    await expect(fetch("https://example.com/")).rejects.toThrow("tests run offline")
  })
})
