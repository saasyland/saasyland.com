import { I18N } from "~/src/integrations/use-intl/i18n.config"

export const CONFIRMATION_WINDOW_IN_HOURS = 24

export const EMAIL_MAX_LENGTH = 255

export const NEWSLETTER_TOKEN_LENGTH = 64

export const newsletterLocaleEnum = { enumValues: I18N.SUPPORTED_LOCALES } as const

export const newsletterSourceEnum = { enumValues: ["footer", "blog", "app"] } as const

export const newsletterStatusEnum = { enumValues: ["subscribed", "unsubscribed", "pending"] } as const

export const SUBSCRIPTION_RESULT = {
  ALREADY_SUBSCRIBED: "alreadySubscribed",
  CONFIRMATION_SENT: "confirmationSent",
} as const

export const NEWSLETTER_SUBSCRIBER_QUERY_KEYS = {
  ALL: ["newsletter-subscriber"],
  SUBSCRIPTION: ["newsletter-subscriber", "getNewsletterSubscription"],
} as const

export const NEWSLETTER_SUBSCRIBER_MUTATION_KEYS = {
  SET_SUBSCRIPTION: ["newsletter-subscriber", "setNewsletterSubscription"],
  SUBSCRIBE: ["newsletter-subscriber", "subscribeToNewsletter"],
} as const
