import zod from "zod/v4"

import { emailSchema } from "~/src/integrations/better-auth/auth.zod"

import { localeField } from "~/src/modules/_core/utils/zod-fields"
import { NEWSLETTER_SOURCES, NEWSLETTER_TOKEN_LENGTH } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.constants"

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

export const newsletterSubscriberZodSchemas = {
  confirmNewsletterSubscription,
  setNewsletterSubscription,
  subscribeToNewsletter,
  unsubscribeFromNewsletter,
}
