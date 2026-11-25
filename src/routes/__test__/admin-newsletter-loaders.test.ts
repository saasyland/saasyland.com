import { afterEach, beforeEach, describe, it, vi } from "vite-plus/test"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { newsletterIssue } from "~/src/modules/newsletter-issue/newsletter-issue.schema"
import { getNewsletterIssuesQuery } from "~/src/modules/newsletter-issue/use-cases/get-newsletter-issues"
import { newsletterSubscriber } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.schema"
import { newsletterSubscribersQuery } from "~/src/modules/newsletter-subscriber/use-cases/get-newsletter-subscribers"
import { listNewsletterSubscribersQuery } from "~/src/modules/newsletter-subscriber/use-cases/list-newsletter-subscribers"

import { EMPTY_PAGE, expectLocalizedAdminPage, expectPrefetched, loadAsAdmin } from "~/src/routes/__test__/fixtures/admin-router"

beforeEach(async () => {
  await db.delete(newsletterIssue)
  await db.delete(newsletterSubscriber)
})

afterEach(() => vi.restoreAllMocks())

describe("admin newsletter route loaders", () => {
  it("loads the subscribers at /admin/newsletter", async () => {
    vi.spyOn(listNewsletterSubscribersQuery, "queryFn")
    const router = await loadAsAdmin("/admin/newsletter")

    expectLocalizedAdminPage(router)
    expectPrefetched(router, listNewsletterSubscribersQuery, EMPTY_PAGE)
  })

  it("loads the issues at /admin/newsletter/issues", async () => {
    vi.spyOn(getNewsletterIssuesQuery, "queryFn")
    const router = await loadAsAdmin("/admin/newsletter/issues")

    expectLocalizedAdminPage(router)
    expectPrefetched(router, getNewsletterIssuesQuery, EMPTY_PAGE)
  })

  it("loads how many confirmed subscribers a new issue goes to at /admin/newsletter/compose", async () => {
    vi.spyOn(newsletterSubscribersQuery, "queryFn")
    const router = await loadAsAdmin("/admin/newsletter/compose")

    expectLocalizedAdminPage(router)
    expectPrefetched(router, newsletterSubscribersQuery, { total: 0 })
  })
})
