import { env } from "cloudflare:workers"

import type { models } from "@polar-sh/sdk/2026-10"
import { eq } from "drizzle-orm"
import { describe, expect, it } from "vite-plus/test"

import { JSON_NULL } from "~/src/platform/testing/lib/json-null"
import { type PolarProduct, polarCustomer, polarSubscription } from "~/src/platform/testing/lib/polar"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { POLAR_RECURRING_INTERVAL, POLAR_SUBSCRIPTION_STATUS } from "~/src/integrations/polar/polar.constants"

import { subscription } from "~/src/modules/subscription/subscription.schema"
import { recordSubscription } from "~/src/modules/subscription/use-cases/record-subscription"
import { user } from "~/src/modules/user/user.schema"

import { DEFAULT_CURRENCY_CODE } from "~/src/data/pricing"

const PRODUCT = {
  id: "product-monthly",
  name: "Monthly plan",
  price: { amount: 2900, currency: DEFAULT_CURRENCY_CODE },
  recurringInterval: POLAR_RECURRING_INTERVAL.MONTH,
} as const satisfies PolarProduct

const STARTED_AT = "2026-11-16T10:00:00.000Z"
const PERIOD_END = "2026-12-16T10:00:00.000Z"
const CANCELED_AT = "2026-11-20T08:00:00.000Z"
const ENDED_AT = "2026-12-16T10:00:01.000Z"

const createAccount = async (): Promise<string> => {
  const id = crypto.randomUUID()
  await db.insert(user).values({ email: `${id}@example.test`, id, name: "Subscriber" })
  return id
}

const startedSubscription = (externalId: string | null): models.Subscription => ({
  ...polarSubscription({
    customer: { ...polarCustomer(env.POLAR_ORGANIZATION_ID, "subscriber"), external_id: externalId },
    product: PRODUCT,
    status: POLAR_SUBSCRIPTION_STATUS.ACTIVE,
  }),
  created_at: STARTED_AT,
  current_period_end: PERIOD_END,
  current_period_start: STARTED_AT,
  started_at: STARTED_AT,
})

const canceled = (started: models.Subscription): models.Subscription => ({
  ...started,
  cancel_at_period_end: true,
  canceled_at: CANCELED_AT,
  ends_at: PERIOD_END,
  modified_at: CANCELED_AT,
})

const ended = (started: models.Subscription): models.Subscription => ({
  ...canceled(started),
  ended_at: ENDED_AT,
  modified_at: ENDED_AT,
  status: POLAR_SUBSCRIPTION_STATUS.CANCELED,
})

const storedSubscription = async (id: string) => {
  const [row] = await db.select().from(subscription).where(eq(subscription.id, id))
  return row
}

describe("recording a Polar subscription", () => {
  it("copies a new subscription under Polar's ID with Polar's fields and its product's name, linked to the subscriber's account", async () => {
    const subscriber = await createAccount()
    const started = startedSubscription(subscriber)

    await recordSubscription(started)

    const stored = await storedSubscription(started.id)
    expect(stored).toStrictEqual({
      amount: PRODUCT.price.amount,
      cancelAtPeriodEnd: false,
      changedAt: new Date(STARTED_AT),
      createdAt: stored?.createdAt,
      currency: DEFAULT_CURRENCY_CODE.toLowerCase(),
      currentPeriodEnd: new Date(PERIOD_END),
      customerId: started.customer_id,
      endedAt: JSON_NULL,
      id: started.id,
      productId: PRODUCT.id,
      productName: PRODUCT.name,
      recurringInterval: POLAR_RECURRING_INTERVAL.MONTH,
      recurringIntervalCount: 1,
      startedAt: new Date(STARTED_AT),
      status: POLAR_SUBSCRIPTION_STATUS.ACTIVE,
      updatedAt: stored?.updatedAt,
      userId: subscriber,
    })
  })

  it("applies each newer version, such as a cancellation at the end of the period and then the end itself", async () => {
    const started = startedSubscription(await createAccount())

    await recordSubscription(started)
    await recordSubscription(canceled(started))
    expect(await storedSubscription(started.id)).toMatchObject({
      cancelAtPeriodEnd: true,
      changedAt: new Date(CANCELED_AT),
      endedAt: JSON_NULL,
      status: POLAR_SUBSCRIPTION_STATUS.ACTIVE,
    })

    await recordSubscription(ended(started))
    expect(await storedSubscription(started.id)).toMatchObject({
      changedAt: new Date(ENDED_AT),
      endedAt: new Date(ENDED_AT),
      startedAt: new Date(STARTED_AT),
      status: POLAR_SUBSCRIPTION_STATUS.CANCELED,
    })
  })

  it("ignores older versions that arrive after a newer one", async () => {
    const started = startedSubscription(await createAccount())
    await recordSubscription(ended(started))
    const recorded = await storedSubscription(started.id)

    await recordSubscription(canceled(started))
    await recordSubscription(started)

    expect(await storedSubscription(started.id)).toStrictEqual(recorded)
  })

  it("writes the same version again with identical values when Polar delivers it twice", async () => {
    const started = canceled(startedSubscription(await createAccount()))
    await recordSubscription(started)
    const recorded = await storedSubscription(started.id)

    await recordSubscription(started)

    const rewritten = await storedSubscription(started.id)
    expect(rewritten).toStrictEqual({ ...recorded, updatedAt: rewritten?.updatedAt })
  })

  it("keeps a subscription that has not started yet without a start", async () => {
    const incomplete = {
      ...startedSubscription(await createAccount()),
      started_at: JSON_NULL,
      status: POLAR_SUBSCRIPTION_STATUS.INCOMPLETE,
    }

    await recordSubscription(incomplete)

    expect(await storedSubscription(incomplete.id)).toMatchObject({ startedAt: JSON_NULL, status: POLAR_SUBSCRIPTION_STATUS.INCOMPLETE })
  })

  it("records a trial that ends without a payment as trial_ended, so it is never read as trialing or active", async () => {
    const started = startedSubscription(await createAccount())

    await recordSubscription({ ...started, status: POLAR_SUBSCRIPTION_STATUS.TRIALING })
    await recordSubscription({ ...started, modified_at: PERIOD_END, status: POLAR_SUBSCRIPTION_STATUS.TRIAL_ENDED })

    expect(await storedSubscription(started.id)).toMatchObject({
      changedAt: new Date(PERIOD_END),
      status: POLAR_SUBSCRIPTION_STATUS.TRIAL_ENDED,
    })
  })
})

describe("the account of a recorded subscription", () => {
  it.each([
    ["names no account", crypto.randomUUID()],
    ["is missing", JSON_NULL],
  ])("stays empty when the customer's external ID %s", async (_case, externalId) => {
    const started = startedSubscription(externalId)

    await recordSubscription(started)

    expect(await storedSubscription(started.id)).toMatchObject({ id: started.id, userId: JSON_NULL })
  })

  it("stays empty when the account was deleted before the subscription arrived", async () => {
    const deleted = await createAccount()
    await db.delete(user).where(eq(user.id, deleted))
    const started = startedSubscription(deleted)

    await recordSubscription(started)

    expect(await storedSubscription(started.id)).toMatchObject({ id: started.id, userId: JSON_NULL })
  })

  it("empties when the account is deleted and stays empty for later versions of the subscription", async () => {
    const subscriber = await createAccount()
    const started = startedSubscription(subscriber)
    await recordSubscription(started)

    await db.delete(user).where(eq(user.id, subscriber))
    expect(await storedSubscription(started.id)).toMatchObject({ userId: JSON_NULL })

    await recordSubscription(canceled(started))
    expect(await storedSubscription(started.id)).toMatchObject({ cancelAtPeriodEnd: true, userId: JSON_NULL })
  })
})
