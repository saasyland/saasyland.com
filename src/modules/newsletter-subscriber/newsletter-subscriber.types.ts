import type * as zod from "zod"

import type { newsletterSubscriber } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.schema"
import type { newsletterSubscriberZodSchemas } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.zod"

export interface NewsletterSubscriber {
  select: typeof newsletterSubscriber.$inferSelect
  insert: typeof newsletterSubscriber.$inferInsert
  confirmNewsletterSubscription: zod.input<typeof newsletterSubscriberZodSchemas.confirmNewsletterSubscription>
  setNewsletterSubscription: zod.input<typeof newsletterSubscriberZodSchemas.setNewsletterSubscription>
  subscribeToNewsletter: zod.input<typeof newsletterSubscriberZodSchemas.subscribeToNewsletter>
  unsubscribeFromNewsletter: zod.input<typeof newsletterSubscriberZodSchemas.unsubscribeFromNewsletter>
}
