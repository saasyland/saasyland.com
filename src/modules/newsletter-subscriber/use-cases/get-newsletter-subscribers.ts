import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { count, eq } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { NEWSLETTER_STATUS, NEWSLETTER_SUBSCRIBER_QUERY_KEYS } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.constants"
import { newsletterSubscriber } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.schema"

export const getNewsletterSubscribers = createServerFn({ method: "GET" })
  .middleware([authorized({ admin: ["access"] })])
  .handler(async () => {
    const totals = await db
      .select({ total: count() })
      .from(newsletterSubscriber)
      .where(eq(newsletterSubscriber.status, NEWSLETTER_STATUS.SUBSCRIBED))

    return { total: totals.reduce((sum, row) => sum + row.total, 0) }
  })

export const newsletterSubscribersQuery = queryOptions({
  queryFn: () => getNewsletterSubscribers(),
  queryKey: NEWSLETTER_SUBSCRIBER_QUERY_KEYS.SUBSCRIBERS,
})
