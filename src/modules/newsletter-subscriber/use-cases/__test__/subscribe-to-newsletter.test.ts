import { env } from "cloudflare:workers"

import type * as StartServerModule from "@tanstack/react-start/server"
import { getRequest } from "@tanstack/react-start/server"
import { render } from "react-email"
import type { Resend } from "resend"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { JSON_NULL } from "~/src/platform/testing/lib/json-null"
import { executeMutation } from "~/src/platform/testing/lib/query"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { SUBSCRIPTION_RESULT } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.constants"
import { newsletterSubscriber } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.schema"
import { newsletterSubscriberZodSchemas } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.zod"
import { subscribeToNewsletterMutation } from "~/src/modules/newsletter-subscriber/use-cases/subscribe-to-newsletter"

const HEADERS = new Headers()

const SUBSCRIBER = "Ada@Example.com"
const ADDRESS = "ada@example.com"

const SINGLE_CALL = 1

const resendSendMock = vi.hoisted(() => vi.fn<Resend["emails"]["send"]>())

beforeEach(async () => {
  await db.delete(newsletterSubscriber)
})
const readSubscriber = async () => {
  const rows = await db.select().from(newsletterSubscriber).limit(1)
  return rows[0]
}

vi.mock(import("@tanstack/react-start/server-only"), () => ({}))

vi.mock(import("~/src/integrations/resend/resend.config"), async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, resend: Object.assign(actual.resend, { emails: { send: resendSendMock } }) }
})

vi.mock(import("@tanstack/react-start/server"), (): Partial<typeof StartServerModule> => ({
  getRequest: vi.fn(() => new Request("http://127.0.0.1:3000/", { headers: HEADERS })),
}))

const mockSuccessfulSend = (): void => {
  resendSendMock.mockReset()
  resendSendMock.mockResolvedValue({ data: { id: "email_1" }, error: JSON_NULL, headers: JSON_NULL })
  vi.mocked(getRequest).mockReturnValue(new Request("http://127.0.0.1:3000/", { headers: HEADERS }))
}

describe("subscribe-to-newsletter", () => {
  it("stores the address as pending and asks the owner of it to confirm", async () => {
    expect.hasAssertions()
    mockSuccessfulSend()

    await expect(executeMutation(subscribeToNewsletterMutation, { email: SUBSCRIBER, locale: "pl-PL" })).resolves.toMatchObject({
      status: SUBSCRIPTION_RESULT.CONFIRMATION_SENT,
    })

    const row = await readSubscriber()
    const [payload, options] = resendSendMock.mock.calls[0]!

    expect(row).toHaveProperty("email", ADDRESS)
    expect(payload).toHaveProperty("to", ADDRESS)
    expect(payload).toHaveProperty("from", env.RESEND_EMAIL_FROM)
    expect(options).toStrictEqual({ idempotencyKey: `newsletter-confirmation/${row!.confirmationToken}` })
  })

  it("tells nobody but the address itself that it was entered", async () => {
    expect.hasAssertions()
    mockSuccessfulSend()

    await executeMutation(subscribeToNewsletterMutation, { email: SUBSCRIBER, locale: "en-US" })

    const recipients = resendSendMock.mock.calls.map(([payload]) => payload.to)

    expect(recipients).toStrictEqual([ADDRESS])
  })

  it("gives every attempt a fresh confirmation window", async () => {
    expect.hasAssertions()
    mockSuccessfulSend()

    await executeMutation(subscribeToNewsletterMutation, { email: SUBSCRIBER, locale: "en-US" })
    await executeMutation(subscribeToNewsletterMutation, { email: SUBSCRIBER, locale: "en-US" })

    const tokens = resendSendMock.mock.calls.map(([, options]) => options?.idempotencyKey)

    expect(new Set(tokens).size).toBe(tokens.length)
  })

  it("reports an address that is already on the list and sends nothing", async () => {
    expect.hasAssertions()
    mockSuccessfulSend()
    await db
      .insert(newsletterSubscriber)
      .values({ email: ADDRESS, id: "existing", status: "subscribed", unsubscribeToken: "existing-token" })

    await expect(executeMutation(subscribeToNewsletterMutation, { email: SUBSCRIBER, locale: "en-US" })).resolves.toMatchObject({
      status: SUBSCRIPTION_RESULT.ALREADY_SUBSCRIBED,
    })

    expect(await readSubscriber()).toMatchObject({ status: "subscribed" })
    expect(resendSendMock).not.toHaveBeenCalled()
  })

  it("asks an address that had unsubscribed to confirm again", async () => {
    expect.hasAssertions()
    mockSuccessfulSend()
    await db
      .insert(newsletterSubscriber)
      .values({ email: ADDRESS, id: "existing", status: "unsubscribed", unsubscribeToken: "existing-token" })

    await expect(executeMutation(subscribeToNewsletterMutation, { email: SUBSCRIBER, locale: "en-US" })).resolves.toMatchObject({
      status: SUBSCRIPTION_RESULT.CONFIRMATION_SENT,
    })

    expect(await db.select().from(newsletterSubscriber)).toHaveLength(SINGLE_CALL)
  })

  it("reports a server error when Resend rejects the send", async () => {
    expect.hasAssertions()
    mockSuccessfulSend()
    resendSendMock.mockResolvedValue({
      data: JSON_NULL,
      error: { message: "failed", name: "application_error", statusCode: JSON_NULL },
      headers: JSON_NULL,
    })

    await expect(executeMutation(subscribeToNewsletterMutation, { email: ADDRESS, locale: "en-US" })).rejects.toThrow(
      ERROR_CODES.INTERNAL_ERROR,
    )
  })

  it("rejects an address that is not an email and sends nothing", async () => {
    expect.hasAssertions()
    mockSuccessfulSend()

    await expect(executeMutation(subscribeToNewsletterMutation, { email: "not-an-email", locale: "en-US" })).rejects.toThrow("VALIDATION")
    expect(resendSendMock).not.toHaveBeenCalled()
  })

  it("rejects a locale the app does not serve", () => {
    expect.hasAssertions()
    mockSuccessfulSend()

    const result = newsletterSubscriberZodSchemas.subscribeToNewsletter.safeParse({ email: ADDRESS, locale: "zz-ZZ" })

    expect(result.success).toBe(false)
    expect(resendSendMock).not.toHaveBeenCalled()
  })

  it.each(["http://localhost:3000", "https://preview.saasyland.com", "https://saasyland.com"])(
    "renders the confirmation link for the actual signup deployment: %s",
    async (origin) => {
      mockSuccessfulSend()
      vi.mocked(getRequest).mockReturnValue(
        new Request(`${origin}/_serverFn/subscribe`, {
          headers: { origin: "https://untrusted.example", "x-forwarded-host": "untrusted.example" },
        }),
      )

      await executeMutation(subscribeToNewsletterMutation, { email: SUBSCRIBER, locale: "pl-PL" })

      const row = await readSubscriber()
      const payload = resendSendMock.mock.calls[0]?.[0]
      expect(payload?.react).toBeDefined()
      const html = await render(payload!.react)
      expect(html).toContain(`href="${origin}/pl-PL/newsletter/confirm?token=${row!.confirmationToken}"`)
      expect(html).toContain('lang="pl-PL"')
      expect(html).not.toContain("untrusted.example")
    },
  )

  it("rejects an untrusted deployment before storing a subscriber or sending email", async () => {
    mockSuccessfulSend()
    vi.mocked(getRequest).mockReturnValue(new Request("https://saasyland.com.attacker.example/_serverFn/subscribe"))

    await expect(executeMutation(subscribeToNewsletterMutation, { email: SUBSCRIBER, locale: "en-US" })).rejects.toThrow(
      ERROR_CODES.FORBIDDEN,
    )
    expect(await readSubscriber()).toBeUndefined()
    expect(resendSendMock).not.toHaveBeenCalled()
  })
})
