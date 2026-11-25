import type * as zod from "zod"

import type { newsletterSubscriber } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.schema"
import type { newsletterSubscriberZodSchemas } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.zod"
import type { listNewsletterSubscribers } from "~/src/modules/newsletter-subscriber/use-cases/list-newsletter-subscribers"

export interface NewsletterSubscriber {
  select: typeof newsletterSubscriber.$inferSelect
  insert: typeof newsletterSubscriber.$inferInsert
  listRow: Awaited<ReturnType<typeof listNewsletterSubscribers>>["rows"][number]
  subscriberFilters: zod.output<typeof newsletterSubscriberZodSchemas.listNewsletterSubscribers>["filters"]
  listNewsletterSubscribers: zod.input<typeof newsletterSubscriberZodSchemas.listNewsletterSubscribers>
  confirmNewsletterSubscription: zod.input<typeof newsletterSubscriberZodSchemas.confirmNewsletterSubscription>
  setNewsletterSubscription: zod.input<typeof newsletterSubscriberZodSchemas.setNewsletterSubscription>
  subscribeToNewsletter: zod.input<typeof newsletterSubscriberZodSchemas.subscribeToNewsletter>
  unsubscribeFromNewsletter: zod.input<typeof newsletterSubscriberZodSchemas.unsubscribeFromNewsletter>
}
