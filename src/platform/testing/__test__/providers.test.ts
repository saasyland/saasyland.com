import { env } from "cloudflare:workers"

import { createElement } from "react"

import { describe, expect, it } from "vite-plus/test"

import { createPolarOrder, polarApi } from "~/src/platform/testing/mocks/polar"
import { takeProviderRefusals } from "~/src/platform/testing/mocks/providers"
import { getSentEmails, resendApi } from "~/src/platform/testing/mocks/resend"

import { polar } from "~/src/integrations/polar/polar.config"
import { POLAR_PRODUCT_IDS } from "~/src/integrations/polar/polar.constants"
import { sendEmail } from "~/src/integrations/resend/resend.utils"

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"
import { LICENSE_TIER } from "~/src/modules/license/license.constants"

const RESEND_EMAILS = `${resendApi.origin}/emails`
const POLAR_CHECKOUTS = `${polarApi.origin}/v1/checkouts/`

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
  it("serves an order through the Polar SDK", async () => {
    const order = createPolarOrder({ externalCustomerId: "customer", tier: LICENSE_TIER.CORE })

    await expect(polar.orders.get(order.id)).resolves.toStrictEqual(order)
  })

  it("answers 404 for an order it does not hold, as Polar does, without refusing the request", async () => {
    await expect(polar.orders.get(crypto.randomUUID())).rejects.toThrow("ResourceNotFound")
    expect(takeProviderRefusals()).toStrictEqual([])
  })

  it.each([
    ["a product the organization does not sell", { products: ["unknown-product"] }],
    ["a checkout without the buyer's account", { external_customer_id: undefined }],
    ["a discount the organization does not have", { discount_id: crypto.randomUUID() }],
    ["a field Polar does not know", { coupon: "LAUNCH" }],
  ])("answers 422 to a checkout for %s and records the refusal", async (_case, change) => {
    const body = {
      allow_discount_codes: false,
      external_customer_id: "customer",
      metadata: {},
      products: [POLAR_PRODUCT_IDS[LICENSE_TIER.CORE]],
      success_url: "http://localhost:3000/app",
      ...change,
    }

    const response = await post(POLAR_CHECKOUTS, body, env.POLAR_ACCESS_TOKEN)

    expect(response.status).toBe(HTTP_STATUS.UNPROCESSABLE_CONTENT)
    expect(takeProviderRefusals()).toHaveLength(1)
  })

  it("answers 401 to a request without the configured access token", async () => {
    await expect(fetch(`${polarApi.origin}/v1/orders/${crypto.randomUUID()}`)).resolves.toHaveProperty("status", HTTP_STATUS.UNAUTHORIZED)
    expect(takeProviderRefusals()).toHaveLength(1)
  })

  it("refuses an endpoint the application never calls", async () => {
    const response = await fetch(`${polarApi.origin}/v1/products/`, { headers: { authorization: `Bearer ${env.POLAR_ACCESS_TOKEN}` } })

    expect(response.status).toBe(HTTP_STATUS.NOT_FOUND)
    expect(takeProviderRefusals()).toHaveLength(1)
  })
})

describe("outbound requests", () => {
  it("fail like an offline network for any origin no provider double serves", async () => {
    await expect(fetch("https://api.github.com/repos/saasyland/saasyland.com")).rejects.toThrow("tests run offline")
  })
})
