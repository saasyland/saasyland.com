import { eq } from "drizzle-orm"
import { assert, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { ONE_CLICK_UNSUBSCRIBE } from "~/src/integrations/resend/resend.constants"

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"
import { NEWSLETTER_STATUS, NEWSLETTER_TOKEN_LENGTH } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.constants"
import { newsletterSubscriber } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.schema"

import { Route as UnsubscribeRoute } from "~/src/routes/_site._marketing.newsletter.unsubscribe"

import { createNonce } from "~/src/lib/content-security-policy"

import { ROUTES } from "~/src/routes"

const TOKEN = "f".repeat(NEWSLETTER_TOKEN_LENGTH)

const postTo = async (url: string) => {
  const handlers = UnsubscribeRoute.options.server?.handlers
  assert(typeof handlers === "object" && handlers.POST)
  const response = await handlers.POST({
    context: { nonce: createNonce() },
    next: vi.fn(),
    params: {},
    pathname: ROUTES.NEWSLETTER.UNSUBSCRIBE,
    request: new Request(url, {
      body: ONE_CLICK_UNSUBSCRIBE,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      method: "POST",
    }),
  })
  assert(response instanceof Response)
  return response
}

const statusOf = async () => {
  const [row] = await db.select().from(newsletterSubscriber).where(eq(newsletterSubscriber.id, "one-click"))
  return row
}

beforeEach(async () => {
  await db.delete(newsletterSubscriber)
  await db.insert(newsletterSubscriber).values({
    email: "one-click@example.test",
    id: "one-click",
    status: NEWSLETTER_STATUS.SUBSCRIBED,
    subscribedAt: new Date(),
    unsubscribeToken: TOKEN,
  })
})

describe("one-click unsubscribe", () => {
  it("unsubscribes the address the link's token names when a mail client posts to it", async () => {
    const response = await postTo(`https://saasyland.com/pl-PL/newsletter/unsubscribe?token=${TOKEN}`)

    expect(response.status).toBe(HTTP_STATUS.OK)
    await expect(response.json()).resolves.toStrictEqual({ unsubscribed: true })
    const row = await statusOf()
    expect(row?.status).toBe(NEWSLETTER_STATUS.UNSUBSCRIBED)
    expect(row?.unsubscribedAt).toBeInstanceOf(Date)
  })

  it("refuses a post without a valid token and changes nothing", async () => {
    const response = await postTo("https://saasyland.com/newsletter/unsubscribe?token=short")

    expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
    await expect(response.json()).resolves.toStrictEqual({ unsubscribed: false })
    await expect(statusOf()).resolves.toMatchObject({ status: NEWSLETTER_STATUS.SUBSCRIBED, unsubscribedAt: null })
  })
})
