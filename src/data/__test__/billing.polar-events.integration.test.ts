import { env } from "cloudflare:workers"

import type { models } from "@polar-sh/sdk/2026-10"
import { eq } from "drizzle-orm"
import { describe, expect, it } from "vite-plus/test"

import { JSON_NULL } from "~/src/platform/testing/lib/json-null"
import { type PolarProduct, polarCustomer, polarOrder, polarSubscription, signedPolarWebhook } from "~/src/platform/testing/lib/polar"
import { TEST_APP_URL } from "~/src/platform/testing/lib/test-request"

import { signUpAndVerify } from "~/src/integrations/better-auth/__test__/fixtures/auth.harness"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import {
  POLAR_ORDER_STATUS,
  POLAR_RECURRING_INTERVAL,
  POLAR_SUBSCRIPTION_STATUS,
  POLAR_WEBHOOK_EVENT,
} from "~/src/integrations/polar/polar.constants"

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"
import { order } from "~/src/modules/order/order.schema"
import { subscription } from "~/src/modules/subscription/subscription.schema"

import { DEFAULT_CURRENCY_CODE } from "~/src/data/pricing"

import { ROUTES } from "~/src/routes"

const WEBHOOKS_URL = new URL(`${ROUTES.API_AUTH_BASE}${ROUTES.API_AUTH_POLAR.WEBHOOKS}`, TEST_APP_URL)

const ONE_TIME = {
  id: "product-one-time",
  name: "One-time product",
  price: { amount: 9900, currency: DEFAULT_CURRENCY_CODE },
  recurringInterval: JSON_NULL,
} as const satisfies PolarProduct

const MONTHLY = {
  id: "product-monthly",
  name: "Monthly plan",
  price: { amount: 1900, currency: DEFAULT_CURRENCY_CODE },
  recurringInterval: POLAR_RECURRING_INTERVAL.MONTH,
} as const satisfies PolarProduct

const CHANGE_DELAY_MS = 60_000

const deliver = async (type: models.WebhookEventType, data: models.Order | models.Subscription): Promise<number> => {
  const { body, headers } = signedPolarWebhook({ data, secret: env.POLAR_WEBHOOK_SECRET, type })
  const response = await auth.handler(new Request(WEBHOOKS_URL, { body, headers, method: "POST" }))
  return response.status
}

const changedLater = (createdAt: string): string => new Date(Date.parse(createdAt) + CHANGE_DELAY_MS).toISOString()

describe("the billing area's copies of Polar's records, through Polar's webhook endpoint", () => {
  it("copies an order that Polar creates for an account and updates the copy when Polar changes the order", async () => {
    const buyer = await signUpAndVerify()
    const placed = polarOrder({
      checkoutId: JSON_NULL,
      customer: polarCustomer(env.POLAR_ORGANIZATION_ID, buyer.userId),
      metadata: {},
      product: ONE_TIME,
      status: POLAR_ORDER_STATUS.PENDING,
    })

    expect(await deliver(POLAR_WEBHOOK_EVENT.ORDER_CREATED, placed)).toBe(HTTP_STATUS.OK)
    await expect(db.select().from(order).where(eq(order.id, placed.id))).resolves.toMatchObject([
      { productId: ONE_TIME.id, status: POLAR_ORDER_STATUS.PENDING, userId: buyer.userId },
    ])

    const voided = { ...placed, modified_at: changedLater(placed.created_at), status: POLAR_ORDER_STATUS.VOID }
    expect(await deliver(POLAR_WEBHOOK_EVENT.ORDER_UPDATED, voided)).toBe(HTTP_STATUS.OK)
    await expect(db.select().from(order).where(eq(order.id, placed.id))).resolves.toMatchObject([
      { status: POLAR_ORDER_STATUS.VOID, userId: buyer.userId },
    ])
  })

  it("copies a subscription that Polar creates for an account and updates the copy when Polar changes the subscription", async () => {
    const subscriber = await signUpAndVerify()
    const started = polarSubscription({
      customer: polarCustomer(env.POLAR_ORGANIZATION_ID, subscriber.userId),
      product: MONTHLY,
      status: POLAR_SUBSCRIPTION_STATUS.ACTIVE,
    })

    expect(await deliver(POLAR_WEBHOOK_EVENT.SUBSCRIPTION_CREATED, started)).toBe(HTTP_STATUS.OK)
    await expect(db.select().from(subscription).where(eq(subscription.id, started.id))).resolves.toMatchObject([
      { cancelAtPeriodEnd: false, productName: MONTHLY.name, status: POLAR_SUBSCRIPTION_STATUS.ACTIVE, userId: subscriber.userId },
    ])

    const canceled = { ...started, cancel_at_period_end: true, modified_at: changedLater(started.created_at) }
    expect(await deliver(POLAR_WEBHOOK_EVENT.SUBSCRIPTION_UPDATED, canceled)).toBe(HTTP_STATUS.OK)
    await expect(db.select().from(subscription).where(eq(subscription.id, started.id))).resolves.toMatchObject([
      { cancelAtPeriodEnd: true, status: POLAR_SUBSCRIPTION_STATUS.ACTIVE, userId: subscriber.userId },
    ])
  })
})
