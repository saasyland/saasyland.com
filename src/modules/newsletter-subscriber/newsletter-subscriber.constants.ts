export const CONFIRMATION_WINDOW_IN_HOURS = 24

export const EMAIL_MAX_LENGTH = 255

export const NEWSLETTER_TOKEN_LENGTH = 64

export const NEWSLETTER_SOURCE = {
  APP: "app",
  BLOG: "blog",
  FOOTER: "footer",
} as const

export const NEWSLETTER_SOURCES = [NEWSLETTER_SOURCE.FOOTER, NEWSLETTER_SOURCE.BLOG, NEWSLETTER_SOURCE.APP] as const

export const NEWSLETTER_STATUS = {
  PENDING: "pending",
  SUBSCRIBED: "subscribed",
  UNSUBSCRIBED: "unsubscribed",
} as const

export const NEWSLETTER_STATUSES = [NEWSLETTER_STATUS.SUBSCRIBED, NEWSLETTER_STATUS.UNSUBSCRIBED, NEWSLETTER_STATUS.PENDING] as const

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
