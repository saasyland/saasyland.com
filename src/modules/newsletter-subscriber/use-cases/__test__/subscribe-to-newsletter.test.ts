import { env } from "cloudflare:workers"

import type * as StartServerModule from "@tanstack/react-start/server"
import { getRequest } from "@tanstack/react-start/server"
import { createHash } from "node:crypto"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { executeMutation } from "~/src/platform/testing/lib/query"
import { getSentEmails } from "~/src/platform/testing/mocks/resend"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { EMAIL_PURPOSE } from "~/src/integrations/resend/resend.constants"

import { ENVIRONMENT, IP_ADDRESS_HEADER } from "~/src/modules/_core/constants/api"
import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { NEWSLETTER_STATUS, SUBSCRIPTION_RESULT } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.constants"
import { newsletterSubscriber } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.schema"
import { newsletterSubscriberZodSchemas } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.zod"
import { subscribeToNewsletterMutation } from "~/src/modules/newsletter-subscriber/use-cases/subscribe-to-newsletter"

const sha256 = (value: string): string => createHash("sha256").update(value).digest("hex")

const HEADERS = new Headers()

const SUBSCRIBER = "Ada@Example.com"
const ADDRESS = "ada@example.com"

const SINGLE_CALL = 1

beforeEach(async () => {
  await db.delete(newsletterSubscriber)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})
const readSubscriber = async () => {
  const rows = await db.select().from(newsletterSubscriber).limit(1)
  return rows[0]
}

vi.mock(import("@tanstack/react-start/server-only"), () => ({}))

vi.mock(import("@tanstack/react-start/server"), (): Partial<typeof StartServerModule> => ({
  getRequest: vi.fn(() => new Request("http://127.0.0.1:3000/", { headers: HEADERS })),
}))

describe("subscribe-to-newsletter", () => {
  it("stores the address as pending and asks the owner of it to confirm", async () => {
    expect.hasAssertions()

    await expect(executeMutation(subscribeToNewsletterMutation, { email: SUBSCRIBER, locale: "pl-PL" })).resolves.toMatchObject({
      status: SUBSCRIPTION_RESULT.CONFIRMATION_SENT,
    })

    const row = await readSubscriber()

    expect(row).toHaveProperty("email", ADDRESS)
    expect(getSentEmails()).toStrictEqual([
      expect.objectContaining({
        from: env.RESEND_EMAIL_FROM,
        idempotencyKey: `${EMAIL_PURPOSE.NEWSLETTER_CONFIRMATION}/${sha256(row!.confirmationToken!)}`,
        to: [ADDRESS],
      }),
    ])
  })

  it("tells nobody but the address itself that it was entered", async () => {
    expect.hasAssertions()

    await executeMutation(subscribeToNewsletterMutation, { email: SUBSCRIBER, locale: "en-US" })

    expect(getSentEmails().map(({ to }) => to)).toStrictEqual([[ADDRESS]])
  })

  it("gives every attempt a fresh confirmation window", async () => {
    expect.hasAssertions()

    await executeMutation(subscribeToNewsletterMutation, { email: SUBSCRIBER, locale: "en-US" })
    await executeMutation(subscribeToNewsletterMutation, { email: SUBSCRIBER, locale: "en-US" })

    const keys = getSentEmails(ADDRESS).map(({ idempotencyKey }) => idempotencyKey)

    expect(keys).toHaveLength(2)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it("reports an address that is already on the list and sends nothing", async () => {
    expect.hasAssertions()
    await db
      .insert(newsletterSubscriber)
      .values({ email: ADDRESS, id: "existing", status: NEWSLETTER_STATUS.SUBSCRIBED, unsubscribeToken: "existing-token" })

    await expect(executeMutation(subscribeToNewsletterMutation, { email: SUBSCRIBER, locale: "en-US" })).resolves.toMatchObject({
      status: SUBSCRIPTION_RESULT.ALREADY_SUBSCRIBED,
    })

    expect(await readSubscriber()).toMatchObject({ status: NEWSLETTER_STATUS.SUBSCRIBED })
    expect(getSentEmails()).toStrictEqual([])
  })

  it("asks an address that had unsubscribed to confirm again", async () => {
    expect.hasAssertions()
    await db
      .insert(newsletterSubscriber)
      .values({ email: ADDRESS, id: "existing", status: NEWSLETTER_STATUS.UNSUBSCRIBED, unsubscribeToken: "existing-token" })

    await expect(executeMutation(subscribeToNewsletterMutation, { email: SUBSCRIBER, locale: "en-US" })).resolves.toMatchObject({
      status: SUBSCRIPTION_RESULT.CONFIRMATION_SENT,
    })

    expect(await db.select().from(newsletterSubscriber)).toHaveLength(SINGLE_CALL)
  })

  it("reports a server error when Resend rejects the send", async () => {
    expect.hasAssertions()
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      Response.json({ message: "failed", name: "application_error", statusCode: 500 }, { status: 500 }),
    )

    await expect(executeMutation(subscribeToNewsletterMutation, { email: ADDRESS, locale: "en-US" })).rejects.toThrow(
      ERROR_CODES.INTERNAL_ERROR,
    )
  })

  it("rejects an address that is not an email and sends nothing", async () => {
    expect.hasAssertions()

    await expect(executeMutation(subscribeToNewsletterMutation, { email: "not-an-email", locale: "en-US" })).rejects.toThrow(
      ERROR_CODES.VALIDATION,
    )
    expect(getSentEmails()).toStrictEqual([])
  })

  it("rejects a locale the app does not serve", () => {
    expect.hasAssertions()

    const result = newsletterSubscriberZodSchemas.subscribeToNewsletter.safeParse({ email: ADDRESS, locale: "zz-ZZ" })

    expect(result.success).toBe(false)
  })

  it.each([
    { mode: ENVIRONMENT.TEST, origin: "http://localhost:3000" },
    { mode: ENVIRONMENT.PREVIEW, origin: "https://preview.saasyland.com" },
    { mode: ENVIRONMENT.PRODUCTION, origin: "https://saasyland.com" },
  ])("renders the confirmation link for the $mode deployment the sign-up came through: $origin", async ({ mode, origin }) => {
    vi.stubEnv("MODE", mode)
    vi.mocked(getRequest).mockReturnValue(
      new Request(`${origin}/_serverFn/subscribe`, {
        headers: { origin: "https://untrusted.example", "x-forwarded-host": "untrusted.example" },
      }),
    )

    await executeMutation(subscribeToNewsletterMutation, { email: SUBSCRIBER, locale: "pl-PL" })

    const row = await readSubscriber()
    const html = getSentEmails(ADDRESS)[0]?.html
    expect(html).toContain(`href="${origin}/pl-PL/newsletter/confirm?token=${row!.confirmationToken}"`)
    expect(html).toContain('lang="pl-PL"')
    expect(html).not.toContain("untrusted.example")
  })

  it("rejects an untrusted deployment before storing a subscriber or sending email", async () => {
    vi.mocked(getRequest).mockReturnValue(new Request("https://saasyland.com.attacker.example/_serverFn/subscribe"))

    await expect(executeMutation(subscribeToNewsletterMutation, { email: SUBSCRIBER, locale: "en-US" })).rejects.toThrow(
      ERROR_CODES.FORBIDDEN,
    )
    expect(await readSubscriber()).toBeUndefined()
    expect(getSentEmails()).toStrictEqual([])
  })
})

describe("subscribe-to-newsletter recipient limit", () => {
  it("sends at most three confirmations to one address per hour, from any number of clients, and answers the same", async () => {
    expect.hasAssertions()
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const results = []

    for (const client of ["203.0.113.1", "203.0.113.2", "203.0.113.3", "203.0.113.4"]) {
      vi.mocked(getRequest).mockReturnValue(new Request("http://127.0.0.1:3000/", { headers: { [IP_ADDRESS_HEADER]: client } }))
      results.push(await executeMutation(subscribeToNewsletterMutation, { email: SUBSCRIBER, locale: "en-US" }))
    }

    expect(getSentEmails(ADDRESS)).toHaveLength(3)
    expect(results).toStrictEqual(Array.from({ length: 4 }, () => ({ status: SUBSCRIPTION_RESULT.CONFIRMATION_SENT })))
    expect(consoleWarn).toHaveBeenCalledWith("[newsletter] confirmation email not sent: the recipient reached the hourly limit")
    consoleWarn.mockRestore()
  })
})
