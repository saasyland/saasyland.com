import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { executeQuery } from "~/src/platform/testing/lib/query"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import {
  NEWSLETTER_STATUS,
  NEWSLETTER_STATUSES,
  NEWSLETTER_TOKEN_LENGTH,
} from "~/src/modules/newsletter-subscriber/newsletter-subscriber.constants"
import { newsletterSubscriber } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.schema"
import { newsletterSubscribersQuery } from "~/src/modules/newsletter-subscriber/use-cases/get-newsletter-subscribers"

beforeEach(async () => {
  await db.delete(newsletterSubscriber)
  await db.insert(newsletterSubscriber).values(
    [...NEWSLETTER_STATUSES, NEWSLETTER_STATUS.SUBSCRIBED].map((status, index) => ({
      email: `reader${index}@example.test`,
      id: `reader-${index}`,
      status,
      unsubscribeToken: `token-${index}`.padEnd(NEWSLETTER_TOKEN_LENGTH, "0"),
    })),
  )
  vi.spyOn(auth.api, "getSession").mockResolvedValue(createAuthSessionFixture({ role: ROLE_CODES.ADMIN }))
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("get-newsletter-subscribers", () => {
  it("counts only the confirmed subscribers", async () => {
    await expect(executeQuery(newsletterSubscribersQuery)).resolves.toStrictEqual({ total: 2 })
  })

  it("answers zero before anyone confirms", async () => {
    await db.delete(newsletterSubscriber)

    await expect(executeQuery(newsletterSubscribersQuery)).resolves.toStrictEqual({ total: 0 })
  })

  it("rejects a caller who may not open the admin", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(createAuthSessionFixture({ role: ROLE_CODES.CUSTOMER }))

    await expect(executeQuery(newsletterSubscribersQuery)).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN })
  })

  it("rejects a signed-out caller", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null)

    await expect(executeQuery(newsletterSubscribersQuery)).rejects.toMatchObject({ code: ERROR_CODES.UNAUTHORIZED })
  })
})
