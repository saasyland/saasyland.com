import { type SQL, eq, gt, lte } from "drizzle-orm"

import { NEWSLETTER_STATUS } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.constants"
import { newsletterSubscriber } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.schema"

export const issueAudience = (createdAt: Date): SQL[] => [
  eq(newsletterSubscriber.status, NEWSLETTER_STATUS.SUBSCRIBED),
  lte(newsletterSubscriber.subscribedAt, createdAt),
]

export const afterRecipient = (recipientId: string | null): SQL[] =>
  recipientId === null ? [] : [gt(newsletterSubscriber.id, recipientId)]
