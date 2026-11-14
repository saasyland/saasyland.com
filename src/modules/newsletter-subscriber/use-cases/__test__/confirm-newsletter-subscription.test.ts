import type * as StartServerModule from "@tanstack/react-start/server"
import { createHash } from "node:crypto"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { executeMutation } from "~/src/platform/testing/lib/query"
import { getSentEmails } from "~/src/platform/testing/mocks/resend"

import { EMAIL_PURPOSE } from "~/src/integrations/resend/resend.constants"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { NEWSLETTER_STATUS, NEWSLETTER_TOKEN_LENGTH } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.constants"
import {
  confirmNewsletterSubscription,
  confirmNewsletterSubscriptionMutation,
} from "~/src/modules/newsletter-subscriber/use-cases/confirm-newsletter-subscription"

import { CONTACT_EMAIL, NOTIFICATIONS_EMAIL } from "~/src/presentation/branding"

const sha256 = (value: string): string => createHash("sha256").update(value).digest("hex")

const HEADERS = new Headers()

const TOKEN = "d".repeat(NEWSLETTER_TOKEN_LENGTH)
const ADDRESS = "ada@example.com"

const SINGLE_CALL = 1

const dbMocks = vi.hoisted(() => {
  const returning = vi.fn<() => Promise<{ email: string; locale: string }[]>>()
  const where = vi.fn<() => { returning: typeof returning }>().mockReturnValue({ returning })
  const set = vi.fn<(update: Record<string, unknown>) => { where: typeof where }>().mockReturnValue({ where })
  const updateMock = vi.fn<() => { set: typeof set }>().mockReturnValue({ set })

  return { returning, set, updateMock }
})

vi.mock(import("@tanstack/react-start/server-only"), () => ({}))

vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, db: Object.assign(actual.db, { update: dbMocks.updateMock }) }
})

vi.mock(import("@tanstack/react-start/server"), (): Partial<typeof StartServerModule> => ({
  getRequest: vi.fn(() => new Request("http://127.0.0.1:3000/", { headers: HEADERS })),
}))

afterEach(() => {
  vi.restoreAllMocks()
})

const mockMatchingToken = (): void => {
  dbMocks.updateMock.mockClear()
  dbMocks.returning.mockResolvedValue([{ email: ADDRESS, locale: "en-US" }])
}

describe("confirm-newsletter-subscription", () => {
  it("moves the row to subscribed and tells the owner", async () => {
    expect.hasAssertions()
    mockMatchingToken()

    await expect(executeMutation(confirmNewsletterSubscriptionMutation, { token: TOKEN })).resolves.toMatchObject({ confirmed: true })

    expect(dbMocks.set).toHaveBeenCalledWith(expect.objectContaining({ status: NEWSLETTER_STATUS.SUBSCRIBED }))
    expect(getSentEmails()).toStrictEqual([
      expect.objectContaining({
        from: NOTIFICATIONS_EMAIL,
        idempotencyKey: `${EMAIL_PURPOSE.NEWSLETTER_NOTIFICATION}/${sha256(TOKEN)}`,
        to: [CONTACT_EMAIL],
      }),
    ])
  })

  it("burns the token so the link works once", async () => {
    expect.hasAssertions()
    mockMatchingToken()

    await confirmNewsletterSubscription({ data: { token: TOKEN } })

    const [update] = dbMocks.set.mock.calls.map(([value]) => value)

    expect(update).toHaveProperty("confirmationToken")
    expect(update).toHaveProperty("confirmationExpiresAt")
  })

  it("reports a token that matched nothing and tells nobody", async () => {
    expect.hasAssertions()
    mockMatchingToken()
    dbMocks.returning.mockResolvedValue([])

    await expect(confirmNewsletterSubscription({ data: { token: TOKEN } })).resolves.toMatchObject({ confirmed: false })

    expect(getSentEmails()).toStrictEqual([])
  })

  it("keeps the confirmation when the owner notification fails", async () => {
    expect.hasAssertions()
    mockMatchingToken()
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      Response.json({ message: "failed", name: "application_error", statusCode: 500 }, { status: 500 }),
    )

    await expect(confirmNewsletterSubscription({ data: { token: TOKEN } })).resolves.toMatchObject({ confirmed: true })

    expect(consoleError).toHaveBeenCalledTimes(SINGLE_CALL)
    consoleError.mockRestore()
  })

  it("rejects a token of the wrong length before it reaches a query", async () => {
    expect.hasAssertions()
    mockMatchingToken()

    await expect(confirmNewsletterSubscription({ data: { token: "short" } })).rejects.toThrow(ERROR_CODES.VALIDATION)
    expect(dbMocks.updateMock).not.toHaveBeenCalled()
  })
})
