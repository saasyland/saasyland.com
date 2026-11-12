import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { eq, sql } from "drizzle-orm"
import { v7 } from "uuid"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import {
  NEWSLETTER_SOURCE,
  NEWSLETTER_STATUS,
  NEWSLETTER_SUBSCRIBER_MUTATION_KEYS,
} from "~/src/modules/newsletter-subscriber/newsletter-subscriber.constants"
import { newsletterSubscriber } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.schema"
import type { NewsletterSubscriber } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.types"
import { createToken } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.utils"
import { newsletterSubscriberZodSchemas } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.zod"

export const setNewsletterSubscription = createServerFn({ method: "POST" })
  .middleware([authorized()])
  .validator((input: NewsletterSubscriber["setNewsletterSubscription"]) =>
    newsletterSubscriberZodSchemas.setNewsletterSubscription.parse(input),
  )
  .handler(async ({ context, data: { isSubscribed, locale } }) => {
    const address = context.auth.user.email.toLowerCase()

    if (!isSubscribed) {
      await db
        .update(newsletterSubscriber)
        .set({ status: NEWSLETTER_STATUS.UNSUBSCRIBED, unsubscribedAt: new Date() })
        .where(eq(newsletterSubscriber.email, address))

      return { isSubscribed: false }
    }

    await db
      .insert(newsletterSubscriber)
      .values({
        email: address,
        id: v7(),
        locale,
        source: NEWSLETTER_SOURCE.APP,
        status: NEWSLETTER_STATUS.SUBSCRIBED,
        subscribedAt: new Date(),
        unsubscribeToken: createToken(),
      })
      .onConflictDoUpdate({
        set: {
          confirmationExpiresAt: sql`null`,
          confirmationToken: sql`null`,
          locale,
          status: NEWSLETTER_STATUS.SUBSCRIBED,
          subscribedAt: new Date(),
          unsubscribedAt: sql`null`,
        },
        target: newsletterSubscriber.email,
      })

    return { isSubscribed: true }
  })

export const setNewsletterSubscriptionMutation = mutationOptions({
  mutationFn: (data: NewsletterSubscriber["setNewsletterSubscription"]) => setNewsletterSubscription({ data }),
  mutationKey: NEWSLETTER_SUBSCRIBER_MUTATION_KEYS.SET_SUBSCRIPTION,
})
