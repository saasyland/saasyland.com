import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

import { timestamps } from "~/src/integrations/drizzle-orm/drizzle.columns"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import {
  EMAIL_MAX_LENGTH,
  NEWSLETTER_SOURCE,
  NEWSLETTER_SOURCES,
  NEWSLETTER_STATUS,
  NEWSLETTER_STATUSES,
  NEWSLETTER_TOKEN_LENGTH,
} from "~/src/modules/newsletter-subscriber/newsletter-subscriber.constants"

export const newsletterSubscriber = sqliteTable(
  "newsletter_subscriber",
  {
    confirmationExpiresAt: integer("confirmation_expires_at", { mode: "timestamp_ms" }),
    confirmationToken: text("confirmation_token", { length: NEWSLETTER_TOKEN_LENGTH }).unique(),
    email: text("email", { length: EMAIL_MAX_LENGTH }).notNull().unique(),
    id: text("id").primaryKey(),
    locale: text("locale", { enum: I18N.SUPPORTED_LOCALES }).notNull().default(I18N.DEFAULT_LOCALE),
    source: text("source", { enum: NEWSLETTER_SOURCES }).notNull().default(NEWSLETTER_SOURCE.FOOTER),
    status: text("status", { enum: NEWSLETTER_STATUSES }).notNull().default(NEWSLETTER_STATUS.PENDING),
    subscribedAt: integer("subscribed_at", { mode: "timestamp_ms" }),
    unsubscribeToken: text("unsubscribe_token", { length: NEWSLETTER_TOKEN_LENGTH }).notNull().unique(),
    unsubscribedAt: integer("unsubscribed_at", { mode: "timestamp_ms" }),
    ...timestamps(),
  },
  (table) => [index("newsletter_subscriber_status_locale_idx").on(table.status, table.locale)],
)
