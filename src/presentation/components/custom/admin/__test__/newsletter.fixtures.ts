import type { QueryClient } from "@tanstack/react-query"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { NEWSLETTER_ISSUE_STATUS } from "~/src/modules/newsletter-issue/newsletter-issue.constants"
import type { NewsletterIssue } from "~/src/modules/newsletter-issue/newsletter-issue.types"
import { getNewsletterIssuesQuery } from "~/src/modules/newsletter-issue/use-cases/get-newsletter-issues"
import { NEWSLETTER_SOURCE, NEWSLETTER_STATUS } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.constants"
import type { NewsletterSubscriber } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.types"
import { newsletterSubscribersQuery } from "~/src/modules/newsletter-subscriber/use-cases/get-newsletter-subscribers"
import { listNewsletterSubscribersQuery } from "~/src/modules/newsletter-subscriber/use-cases/list-newsletter-subscribers"

import { fixtureDate } from "~/src/presentation/components/custom/admin/__test__/fixture-date"

export const newsletterSubscriberRow = (overrides: Partial<NewsletterSubscriber["listRow"]> = {}): NewsletterSubscriber["listRow"] => ({
  createdAt: fixtureDate,
  email: "ada@example.test",
  id: "subscriber-ada",
  locale: I18N.DEFAULT_LOCALE,
  source: NEWSLETTER_SOURCE.FOOTER,
  status: NEWSLETTER_STATUS.SUBSCRIBED,
  subscribedAt: fixtureDate,
  unsubscribedAt: null,
  ...overrides,
})

export const newsletterIssueRow = (overrides: Partial<NewsletterIssue["listRow"]> = {}): NewsletterIssue["listRow"] => ({
  createdAt: fixtureDate,
  id: "issue-one",
  locales: [I18N.DEFAULT_LOCALE],
  recipientCount: 3,
  sentAt: fixtureDate,
  sentCount: 3,
  status: NEWSLETTER_ISSUE_STATUS.SENT,
  subject: "Issue one",
  ...overrides,
})

export const seedNewsletterQueries = (queryClient: QueryClient): void => {
  queryClient.setQueryData(newsletterSubscribersQuery.queryKey, { total: 0 })
  queryClient.setQueryData(listNewsletterSubscribersQuery.queryKey, { rows: [], total: 0 })
  queryClient.setQueryData(getNewsletterIssuesQuery.queryKey, { rows: [], total: 0 })
}
