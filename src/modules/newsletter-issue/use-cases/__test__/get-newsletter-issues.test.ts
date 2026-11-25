import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { executeQuery } from "~/src/platform/testing/lib/query"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { NEWSLETTER_ISSUE_STATUS } from "~/src/modules/newsletter-issue/newsletter-issue.constants"
import { newsletterIssue } from "~/src/modules/newsletter-issue/newsletter-issue.schema"
import { getNewsletterIssuesPageQuery, getNewsletterIssuesQuery } from "~/src/modules/newsletter-issue/use-cases/get-newsletter-issues"

import { MILLISECONDS_PER_DAY } from "~/src/lib/duration"

const POLISH = "pl-PL"
const NOW = Date.parse("2026-11-20T10:00:00.000Z")

const ISSUES = [
  {
    body: { [I18N.DEFAULT_LOCALE]: "First body", [POLISH]: "Pierwsza treść" },
    createdAt: new Date(NOW - MILLISECONDS_PER_DAY * 2),
    id: "issue-old",
    recipientCount: 4,
    sentAt: new Date(NOW - MILLISECONDS_PER_DAY * 2),
    sentCount: 4,
    status: NEWSLETTER_ISSUE_STATUS.SENT,
    subject: { [I18N.DEFAULT_LOCALE]: "Launch notes", [POLISH]: "Notatki z premiery" },
  },
  {
    body: { [I18N.DEFAULT_LOCALE]: "Second body" },
    createdAt: new Date(NOW),
    id: "issue-new",
    recipientCount: 9,
    sentCount: 2,
    status: NEWSLETTER_ISSUE_STATUS.SENDING,
    subject: { [I18N.DEFAULT_LOCALE]: "Pricing changes" },
  },
]

beforeEach(async () => {
  await db.delete(newsletterIssue)
  await db.insert(newsletterIssue).values(ISSUES)
  vi.spyOn(auth.api, "getSession").mockResolvedValue(createAuthSessionFixture({ role: ROLE_CODES.ADMIN }))
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("get-newsletter-issues", () => {
  it("lists the newest issue first with its English subject, progress and complete languages", async () => {
    await expect(executeQuery(getNewsletterIssuesQuery)).resolves.toStrictEqual({
      rows: [
        {
          createdAt: new Date(NOW),
          id: "issue-new",
          locales: [I18N.DEFAULT_LOCALE],
          recipientCount: 9,
          sentAt: null,
          sentCount: 2,
          status: NEWSLETTER_ISSUE_STATUS.SENDING,
          subject: "Pricing changes",
        },
        {
          createdAt: new Date(NOW - MILLISECONDS_PER_DAY * 2),
          id: "issue-old",
          locales: [I18N.DEFAULT_LOCALE, POLISH],
          recipientCount: 4,
          sentAt: new Date(NOW - MILLISECONDS_PER_DAY * 2),
          sentCount: 4,
          status: NEWSLETTER_ISSUE_STATUS.SENT,
          subject: "Launch notes",
        },
      ],
      total: 2,
    })
  })

  it("searches the subject in every language, filters and sorts on the server", async () => {
    await expect(executeQuery(getNewsletterIssuesPageQuery({ search: "PREMIERY" }))).resolves.toMatchObject({
      rows: [{ id: "issue-old" }],
      total: 1,
    })
    await expect(
      executeQuery(getNewsletterIssuesPageQuery({ filters: { status: [NEWSLETTER_ISSUE_STATUS.SENDING] } })),
    ).resolves.toMatchObject({ rows: [{ id: "issue-new" }], total: 1 })
    await expect(
      executeQuery(getNewsletterIssuesPageQuery({ filters: { createdAt: { to: NOW - MILLISECONDS_PER_DAY } } })),
    ).resolves.toMatchObject({ rows: [{ id: "issue-old" }] })
    await expect(executeQuery(getNewsletterIssuesPageQuery({ sorting: [{ desc: false, id: "sentCount" }] }))).resolves.toMatchObject({
      rows: [{ id: "issue-new" }, { id: "issue-old" }],
    })
    await expect(executeQuery(getNewsletterIssuesPageQuery({ sorting: [{ desc: true, id: "sentCount" }] }))).resolves.toMatchObject({
      rows: [{ id: "issue-old" }, { id: "issue-new" }],
    })
  })

  it("rejects a caller who may not open the admin", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(createAuthSessionFixture({ role: ROLE_CODES.CUSTOMER }))

    await expect(executeQuery(getNewsletterIssuesQuery)).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN })
  })
})
