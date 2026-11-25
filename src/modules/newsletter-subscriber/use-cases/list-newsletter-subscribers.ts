import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { type SQL, and, asc, count, desc } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { anyContains, oneOf, withinDates } from "~/src/integrations/drizzle-orm/drizzle.search"

import { NEWSLETTER_SUBSCRIBER_QUERY_KEYS } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.constants"
import { newsletterSubscriber } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.schema"
import type { NewsletterSubscriber } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.types"
import { newsletterSubscriberZodSchemas } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.zod"

const sortColumns = {
  createdAt: newsletterSubscriber.createdAt,
  email: newsletterSubscriber.email,
  locale: newsletterSubscriber.locale,
  status: newsletterSubscriber.status,
  subscribedAt: newsletterSubscriber.subscribedAt,
}

const matching = (
  search: string,
  { createdAt, locale, source, status, subscribedAt }: NewsletterSubscriber["subscriberFilters"],
): SQL | undefined =>
  and(
    ...anyContains([newsletterSubscriber.email], search),
    ...withinDates(newsletterSubscriber.createdAt, createdAt),
    ...oneOf(newsletterSubscriber.locale, locale),
    ...oneOf(newsletterSubscriber.source, source),
    ...oneOf(newsletterSubscriber.status, status),
    ...withinDates(newsletterSubscriber.subscribedAt, subscribedAt),
  )

export const listNewsletterSubscribers = createServerFn({ method: "GET" })
  .middleware([authorized({ admin: ["access"] })])
  .validator((input: NewsletterSubscriber["listNewsletterSubscribers"]) =>
    newsletterSubscriberZodSchemas.listNewsletterSubscribers.parse(input),
  )
  .handler(async ({ data }) => {
    const where = matching(data.search, data.filters)
    const [rows, totals] = await db.batch([
      db
        .select({
          createdAt: newsletterSubscriber.createdAt,
          email: newsletterSubscriber.email,
          id: newsletterSubscriber.id,
          locale: newsletterSubscriber.locale,
          source: newsletterSubscriber.source,
          status: newsletterSubscriber.status,
          subscribedAt: newsletterSubscriber.subscribedAt,
          unsubscribedAt: newsletterSubscriber.unsubscribedAt,
        })
        .from(newsletterSubscriber)
        .where(where)
        .orderBy(
          ...data.sorting.map((sort) => (sort.desc ? desc : asc)(sortColumns[sort.id])),
          desc(newsletterSubscriber.createdAt),
          asc(newsletterSubscriber.id),
        )
        .limit(data.pageSize)
        .offset(data.pageIndex * data.pageSize),
      db.select({ total: count() }).from(newsletterSubscriber).where(where),
    ])

    return { rows, total: totals.reduce((sum, { total }) => sum + total, 0) }
  })

export const listNewsletterSubscribersPageQuery = (input: NewsletterSubscriber["listNewsletterSubscribers"] = {}) =>
  queryOptions<Awaited<ReturnType<typeof listNewsletterSubscribers>>>({
    queryFn: () => listNewsletterSubscribers({ data: input }),
    queryKey: [...NEWSLETTER_SUBSCRIBER_QUERY_KEYS.LIST, newsletterSubscriberZodSchemas.listNewsletterSubscribers.parse(input)],
  })

export const listNewsletterSubscribersQuery = listNewsletterSubscribersPageQuery()
