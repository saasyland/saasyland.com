import * as zod from "zod"

import { emailSchema } from "~/src/integrations/better-auth/auth.zod"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { choiceOf, paginationSchema, searchTextField, sortingOf } from "~/src/modules/_core/utils/pagination"
import { dateRangeField, localeField } from "~/src/modules/_core/utils/zod-fields"
import {
  NEWSLETTER_SOURCES,
  NEWSLETTER_STATUSES,
  NEWSLETTER_SUBSCRIBER_SORT_COLUMNS,
  NEWSLETTER_TOKEN_LENGTH,
} from "~/src/modules/newsletter-subscriber/newsletter-subscriber.constants"

const tokenField = zod.string().length(NEWSLETTER_TOKEN_LENGTH, { message: "tokenInvalid" })

const subscribeToNewsletter = zod.object({
  email: emailSchema,
  locale: localeField,
  source: zod.enum(NEWSLETTER_SOURCES).optional(),
})

const unsubscribeFromNewsletter = zod.object({
  token: tokenField,
})

const confirmNewsletterSubscription = zod.object({
  token: tokenField,
})

const setNewsletterSubscription = zod.object({
  isSubscribed: zod.boolean(),
  locale: localeField,
})

const subscriberFilters = zod.object({
  createdAt: dateRangeField.optional(),
  locale: zod.array(choiceOf(I18N.SUPPORTED_LOCALES)).max(I18N.SUPPORTED_LOCALES.length).optional(),
  source: zod.array(choiceOf(NEWSLETTER_SOURCES)).max(NEWSLETTER_SOURCES.length).optional(),
  status: zod.array(choiceOf(NEWSLETTER_STATUSES)).max(NEWSLETTER_STATUSES.length).optional(),
  subscribedAt: dateRangeField.optional(),
})

const listNewsletterSubscribers = paginationSchema.extend({
  filters: subscriberFilters.default({}),
  search: searchTextField.default(""),
  sorting: sortingOf(NEWSLETTER_SUBSCRIBER_SORT_COLUMNS),
})

export const newsletterSubscriberZodSchemas = {
  confirmNewsletterSubscription,
  listNewsletterSubscribers,
  setNewsletterSubscription,
  subscribeToNewsletter,
  unsubscribeFromNewsletter,
}
