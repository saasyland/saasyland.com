import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { executeQuery } from "~/src/platform/testing/lib/query"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import {
  NEWSLETTER_SOURCE,
  NEWSLETTER_STATUS,
  NEWSLETTER_TOKEN_LENGTH,
} from "~/src/modules/newsletter-subscriber/newsletter-subscriber.constants"
import { newsletterSubscriber } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.schema"
import {
  listNewsletterSubscribersPageQuery,
  listNewsletterSubscribersQuery,
} from "~/src/modules/newsletter-subscriber/use-cases/list-newsletter-subscribers"

import { MILLISECONDS_PER_DAY } from "~/src/lib/duration"

const POLISH: SupportedLocale = "pl-PL"
const NOW = Date.parse("2026-11-20T10:00:00.000Z")

const SUBSCRIBERS = [
  {
    createdAt: new Date(NOW - MILLISECONDS_PER_DAY * 3),
    email: "ada@example.test",
    id: "ada",
    locale: POLISH,
    source: NEWSLETTER_SOURCE.BLOG,
    status: NEWSLETTER_STATUS.SUBSCRIBED,
    subscribedAt: new Date(NOW - MILLISECONDS_PER_DAY * 2),
  },
  {
    createdAt: new Date(NOW),
    email: "grace@example.test",
    id: "grace",
    locale: I18N.DEFAULT_LOCALE,
    source: NEWSLETTER_SOURCE.FOOTER,
    status: NEWSLETTER_STATUS.PENDING,
  },
]

beforeEach(async () => {
  await db.delete(newsletterSubscriber)
  await db
    .insert(newsletterSubscriber)
    .values(SUBSCRIBERS.map((row, index) => ({ ...row, unsubscribeToken: String(index).padEnd(NEWSLETTER_TOKEN_LENGTH, "0") })))
  vi.spyOn(auth.api, "getSession").mockResolvedValue(createAuthSessionFixture({ role: ROLE_CODES.ADMIN }))
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("list-newsletter-subscribers", () => {
  it("lists every subscriber, newest sign-up first, without their tokens", async () => {
    await expect(executeQuery(listNewsletterSubscribersQuery)).resolves.toStrictEqual({
      rows: [
        { ...SUBSCRIBERS[1], subscribedAt: null, unsubscribedAt: null },
        { ...SUBSCRIBERS[0], unsubscribedAt: null },
      ],
      total: 2,
    })
  })

  it("searches the email and filters by status, language, source and days on the server", async () => {
    await expect(executeQuery(listNewsletterSubscribersPageQuery({ search: "ADA@" }))).resolves.toMatchObject({
      rows: [{ id: "ada" }],
      total: 1,
    })
    await expect(
      executeQuery(
        listNewsletterSubscribersPageQuery({
          filters: {
            createdAt: { to: NOW - MILLISECONDS_PER_DAY },
            locale: [POLISH],
            source: [NEWSLETTER_SOURCE.BLOG],
            status: [NEWSLETTER_STATUS.SUBSCRIBED],
            subscribedAt: { from: NOW - MILLISECONDS_PER_DAY * 3 },
          },
        }),
      ),
    ).resolves.toMatchObject({ rows: [{ id: "ada" }], total: 1 })
    await expect(executeQuery(listNewsletterSubscribersPageQuery({ sorting: [{ desc: false, id: "email" }] }))).resolves.toMatchObject({
      rows: [{ id: "ada" }, { id: "grace" }],
    })
    await expect(executeQuery(listNewsletterSubscribersPageQuery({ sorting: [{ desc: true, id: "locale" }] }))).resolves.toMatchObject({
      rows: [{ id: "ada" }, { id: "grace" }],
    })
  })

  it("rejects a caller who may not open the admin", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(createAuthSessionFixture({ role: ROLE_CODES.CUSTOMER }))

    await expect(executeQuery(listNewsletterSubscribersQuery)).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN })
  })
})
