import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"

import { RATE_LIMITS, withRateLimit } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { NEWSLETTER_STATUS, NEWSLETTER_SUBSCRIBER_MUTATION_KEYS } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.constants"
import { newsletterSubscriber } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.schema"
import type { NewsletterSubscriber } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.types"
import { newsletterSubscriberZodSchemas } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.zod"

export const unsubscribeFromNewsletter = createServerFn({ method: "POST" })
  .middleware([withRateLimit("unsubscribe-from-newsletter", RATE_LIMITS.TOKEN)])
  .validator((input: NewsletterSubscriber["unsubscribeFromNewsletter"]) =>
    newsletterSubscriberZodSchemas.unsubscribeFromNewsletter.parse(input),
  )
  .handler(async ({ data: { token } }): Promise<{ unsubscribed: true }> => {
    await db
      .update(newsletterSubscriber)
      .set({ status: NEWSLETTER_STATUS.UNSUBSCRIBED, unsubscribedAt: new Date() })
      .where(eq(newsletterSubscriber.unsubscribeToken, token))

    return { unsubscribed: true }
  })

export const unsubscribeFromNewsletterMutation = mutationOptions({
  mutationFn: (data: NewsletterSubscriber["unsubscribeFromNewsletter"]) => unsubscribeFromNewsletter({ data }),
  mutationKey: NEWSLETTER_SUBSCRIBER_MUTATION_KEYS.UNSUBSCRIBE,
})
