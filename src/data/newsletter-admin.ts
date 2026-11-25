import { NEWSLETTER_ISSUE_STATUS, type NewsletterIssueStatus } from "~/src/modules/newsletter-issue/newsletter-issue.constants"
import { NEWSLETTER_STATUS, type NEWSLETTER_STATUSES } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.constants"

import type { BadgeVariant } from "~/src/presentation/components/shadcn/badge"

export const NEWSLETTER_SUBSCRIBER_STATUS_BADGES: Record<(typeof NEWSLETTER_STATUSES)[number], BadgeVariant> = {
  [NEWSLETTER_STATUS.PENDING]: "warning",
  [NEWSLETTER_STATUS.SUBSCRIBED]: "accent",
  [NEWSLETTER_STATUS.UNSUBSCRIBED]: "neutral",
}

export const NEWSLETTER_ISSUE_STATUS_BADGES: Record<NewsletterIssueStatus, BadgeVariant> = {
  [NEWSLETTER_ISSUE_STATUS.SENDING]: "warning",
  [NEWSLETTER_ISSUE_STATUS.SENT]: "accent",
}

export const NEWSLETTER_SUBSCRIBER_COLUMN_SIZES = {
  createdAt: 200,
  email: 280,
  locale: 168,
  source: 136,
  status: 152,
  subscribedAt: 200,
} as const

export const NEWSLETTER_ISSUE_COLUMN_SIZES = {
  createdAt: 200,
  locales: 200,
  recipients: 176,
  sentAt: 200,
  status: 136,
  subject: 320,
} as const
