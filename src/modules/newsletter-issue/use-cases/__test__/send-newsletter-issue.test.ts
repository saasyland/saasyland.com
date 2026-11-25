import type * as StartServerModule from "@tanstack/react-start/server"
import { eq } from "drizzle-orm"
import { createHash } from "node:crypto"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { executeMutation } from "~/src/platform/testing/lib/query"
import { failNextResendDelivery } from "~/src/platform/testing/lib/resend"
import { getSentEmails } from "~/src/platform/testing/mocks/resend"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { EMAIL_HEADER, ONE_CLICK_UNSUBSCRIBE } from "~/src/integrations/resend/resend.constants"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import {
  NEWSLETTER_ISSUE_EMAIL_PURPOSE,
  NEWSLETTER_ISSUE_LEASE_SECONDS,
  NEWSLETTER_ISSUE_STATUS,
} from "~/src/modules/newsletter-issue/newsletter-issue.constants"
import { newsletterIssue } from "~/src/modules/newsletter-issue/newsletter-issue.schema"
import { createNewsletterIssueMutation } from "~/src/modules/newsletter-issue/use-cases/create-newsletter-issue"
import { sendNewsletterIssue, sendNewsletterIssueMutation } from "~/src/modules/newsletter-issue/use-cases/send-newsletter-issue"
import { NEWSLETTER_STATUS, NEWSLETTER_TOKEN_LENGTH } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.constants"
import { newsletterSubscriber } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.schema"
import { rateLimit } from "~/src/modules/rate-limit/rate-limit.schema"

import { MILLISECONDS_PER_SECOND } from "~/src/lib/duration"

vi.mock(import("@tanstack/react-start/server-only"), () => ({}))

vi.mock(import("@tanstack/react-start/server"), (): Partial<typeof StartServerModule> => ({
  getRequest: vi.fn(() => new Request("http://127.0.0.1:3000/")),
}))

vi.mock("~/src/integrations/resend/resend.constants", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  RESEND_BATCH_LIMIT: 2,
}))

vi.mock("~/src/modules/newsletter-issue/newsletter-issue.constants", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  NEWSLETTER_ISSUE_BATCHES_PER_STEP: 2,
}))

const POLISH = "pl-PL"
const GERMAN = "de-DE"
const ISSUE_ID = "019ab7c0-0000-7000-8000-000000000001"
const CONFIRMED_AT = new Date("2026-11-20T10:00:00.000Z")

const TEXTS = {
  body: { [I18N.DEFAULT_LOCALE]: "Hello readers.\n\nSecond paragraph.", [POLISH]: "Cześć." },
  subject: { [I18N.DEFAULT_LOCALE]: "Issue one", [POLISH]: "Numer pierwszy" },
}

const sha256 = (value: string): string => createHash("sha256").update(value).digest("hex")

const tokenOf = (index: number): string => String(index).padStart(NEWSLETTER_TOKEN_LENGTH, "a")

const subscriber = (index: number, overrides: Partial<typeof newsletterSubscriber.$inferInsert> = {}) => ({
  email: `reader${String(index)}@example.test`,
  id: `reader-${String(index)}`,
  locale: I18N.DEFAULT_LOCALE,
  status: NEWSLETTER_STATUS.SUBSCRIBED,
  subscribedAt: CONFIRMED_AT,
  unsubscribeToken: tokenOf(index),
  ...overrides,
})

const readIssue = async () => {
  const [issue] = await db.select().from(newsletterIssue).where(eq(newsletterIssue.id, ISSUE_ID))
  return issue
}

const createIssue = () => executeMutation(createNewsletterIssueMutation, { ...TEXTS, issueId: ISSUE_ID })

const sendToReaders = async () => {
  const confirmedLater = new Date(Date.now() + MILLISECONDS_PER_SECOND * NEWSLETTER_ISSUE_LEASE_SECONDS)
  await db
    .insert(newsletterSubscriber)
    .values([
      subscriber(1, { locale: POLISH }),
      subscriber(2, { locale: GERMAN }),
      subscriber(3),
      subscriber(4, { status: NEWSLETTER_STATUS.PENDING, subscribedAt: null }),
      subscriber(5, { status: NEWSLETTER_STATUS.UNSUBSCRIBED }),
      subscriber(6, { subscribedAt: confirmedLater }),
    ])
  await createIssue()
  return executeMutation(sendNewsletterIssueMutation, { issueId: ISSUE_ID })
}

beforeEach(async () => {
  await db.delete(newsletterIssue)
  await db.delete(newsletterSubscriber)
  await db.delete(rateLimit)
  vi.spyOn(auth.api, "getSession").mockResolvedValue(createAuthSessionFixture({ role: ROLE_CODES.ADMIN }))
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("send-newsletter-issue", () => {
  it("sends the issue once to each confirmed subscriber in their language, with one-click unsubscribe headers", async () => {
    await expect(sendToReaders()).resolves.toStrictEqual({
      isClaimed: true,
      issueId: ISSUE_ID,
      recipientCount: 3,
      sentCount: 3,
      status: NEWSLETTER_ISSUE_STATUS.SENT,
    })

    const emails = getSentEmails()
    expect(emails.map(({ subject, to }) => [to, subject])).toStrictEqual([
      [["reader1@example.test"], "Numer pierwszy"],
      [["reader2@example.test"], "Issue one"],
      [["reader3@example.test"], "Issue one"],
    ])
    const [polish, german] = emails
    expect(polish?.html).toContain(`lang="${POLISH}"`)
    expect(polish?.html).toContain("Cześć.")
    expect(german?.html).toContain(`lang="${I18N.DEFAULT_LOCALE}"`)
    expect(german?.html).toContain("Second paragraph.")
    const unsubscribe = `http://127.0.0.1:3000/de-DE/newsletter/unsubscribe?token=${tokenOf(2)}`
    expect(german?.html).toContain(`href="${unsubscribe}"`)
    expect(german?.headers).toStrictEqual({
      [EMAIL_HEADER.LIST_UNSUBSCRIBE]: `<${unsubscribe}>`,
      [EMAIL_HEADER.LIST_UNSUBSCRIBE_POST]: ONE_CLICK_UNSUBSCRIBE,
    })
  })

  it("keys each batch on the issue and its recipients, records the issue as sent and sends nothing more for it", async () => {
    await sendToReaders()

    const keys = new Set(getSentEmails().map(({ idempotencyKey }) => idempotencyKey))
    expect(keys).toStrictEqual(
      new Set([
        `${NEWSLETTER_ISSUE_EMAIL_PURPOSE.NEWSLETTER_ISSUE}/${sha256(`${ISSUE_ID}:reader-1:reader-2`)}`,
        `${NEWSLETTER_ISSUE_EMAIL_PURPOSE.NEWSLETTER_ISSUE}/${sha256(`${ISSUE_ID}:reader-3`)}`,
      ]),
    )
    const issue = await readIssue()
    expect(issue).toMatchObject({ lastRecipientId: "reader-3", leaseExpiresAt: null, status: NEWSLETTER_ISSUE_STATUS.SENT })
    expect(issue?.sentAt).toBeInstanceOf(Date)

    await expect(createIssue()).resolves.toStrictEqual({ issueId: ISSUE_ID })
    await expect(executeMutation(sendNewsletterIssueMutation, { issueId: ISSUE_ID })).resolves.toMatchObject({
      isClaimed: false,
      status: NEWSLETTER_ISSUE_STATUS.SENT,
    })
    expect(getSentEmails()).toHaveLength(3)
  })

  it("sends a bounded number of batches per request and resumes after the last one", async () => {
    await db.insert(newsletterSubscriber).values([1, 2, 3, 4, 5].map((index) => subscriber(index)))
    await createIssue()

    await expect(sendNewsletterIssue({ data: { issueId: ISSUE_ID } })).resolves.toStrictEqual({
      isClaimed: true,
      issueId: ISSUE_ID,
      recipientCount: 5,
      sentCount: 4,
      status: NEWSLETTER_ISSUE_STATUS.SENDING,
    })
    await expect(readIssue()).resolves.toMatchObject({ lastRecipientId: "reader-4", leaseExpiresAt: null })

    await expect(sendNewsletterIssue({ data: { issueId: ISSUE_ID } })).resolves.toMatchObject({
      sentCount: 5,
      status: NEWSLETTER_ISSUE_STATUS.SENT,
    })
    expect(getSentEmails().flatMap(({ to }) => to)).toStrictEqual([1, 2, 3, 4, 5].map((index) => `reader${String(index)}@example.test`))
  })

  it("keeps calling the server until the issue is sent when the admin sends it", async () => {
    await db.insert(newsletterSubscriber).values([1, 2, 3, 4, 5].map((index) => subscriber(index)))
    await createIssue()

    await expect(executeMutation(sendNewsletterIssueMutation, { issueId: ISSUE_ID })).resolves.toMatchObject({
      isClaimed: true,
      sentCount: 5,
      status: NEWSLETTER_ISSUE_STATUS.SENT,
    })
    expect(getSentEmails()).toHaveLength(5)
  })

  it("finishes an issue whose last batch was full on the next read of an empty batch", async () => {
    await db.insert(newsletterSubscriber).values([subscriber(1), subscriber(2)])
    await createIssue()

    await expect(sendNewsletterIssue({ data: { issueId: ISSUE_ID } })).resolves.toMatchObject({
      sentCount: 2,
      status: NEWSLETTER_ISSUE_STATUS.SENT,
    })
  })

  it("counts only the emails Resend accepts and still finishes the issue", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {})
    await db.insert(newsletterSubscriber).values([subscriber(1), subscriber(2, { email: "not-an-address" })])
    await createIssue()

    await expect(sendNewsletterIssue({ data: { issueId: ISSUE_ID } })).resolves.toMatchObject({
      recipientCount: 2,
      sentCount: 1,
      status: NEWSLETTER_ISSUE_STATUS.SENT,
    })
  })

  it("sends nothing while another request holds the lease", async () => {
    await db.insert(newsletterSubscriber).values([subscriber(1)])
    await createIssue()
    await db
      .update(newsletterIssue)
      .set({ leaseExpiresAt: new Date(Date.now() + NEWSLETTER_ISSUE_LEASE_SECONDS * MILLISECONDS_PER_SECOND) })
      .where(eq(newsletterIssue.id, ISSUE_ID))

    await expect(executeMutation(sendNewsletterIssueMutation, { issueId: ISSUE_ID })).resolves.toStrictEqual({
      isClaimed: false,
      issueId: ISSUE_ID,
      recipientCount: 1,
      sentCount: 0,
      status: NEWSLETTER_ISSUE_STATUS.SENDING,
    })
    expect(getSentEmails()).toStrictEqual([])
  })

  it("releases the lease when Resend refuses a batch, and a retry sends each email once", async () => {
    await db.insert(newsletterSubscriber).values([1, 2, 3].map((index) => subscriber(index)))
    await createIssue()
    vi.spyOn(console, "error").mockImplementation(() => {})
    failNextResendDelivery()

    await expect(sendNewsletterIssue({ data: { issueId: ISSUE_ID } })).rejects.toMatchObject({ code: ERROR_CODES.INTERNAL_ERROR })
    await expect(readIssue()).resolves.toMatchObject({ leaseExpiresAt: null, sentCount: 0, status: NEWSLETTER_ISSUE_STATUS.SENDING })

    await expect(executeMutation(sendNewsletterIssueMutation, { issueId: ISSUE_ID })).resolves.toMatchObject({
      sentCount: 3,
      status: NEWSLETTER_ISSUE_STATUS.SENT,
    })
    expect(getSentEmails().flatMap(({ to }) => to)).toStrictEqual([1, 2, 3].map((index) => `reader${String(index)}@example.test`))
  })

  it("answers not found for an issue that does not exist", async () => {
    await expect(sendNewsletterIssue({ data: { issueId: "missing" } })).rejects.toMatchObject({ code: ERROR_CODES.NOT_FOUND })
  })

  it("rejects a caller who may not open the admin", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(createAuthSessionFixture({ role: ROLE_CODES.CUSTOMER }))

    await expect(sendNewsletterIssue({ data: { issueId: ISSUE_ID } })).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN })
    await expect(createIssue()).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN })
  })
})
