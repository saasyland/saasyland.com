import { sql } from "drizzle-orm"
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import {
  EMAIL_MAX_LENGTH,
  NEWSLETTER_SOURCES,
  NEWSLETTER_STATUSES,
  NEWSLETTER_TOKEN_LENGTH,
} from "~/src/modules/newsletter-subscriber/newsletter-subscriber.constants"

export const newsletterSubscriber = sqliteTable(
  "newsletter_subscriber",
  {
    confirmationExpiresAt: integer("confirmation_expires_at", { mode: "timestamp_ms" }),
    confirmationToken: text("confirmation_token", { length: NEWSLETTER_TOKEN_LENGTH }).unique(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(unixepoch() * 1000)`)
      .notNull(),
    email: text("email", { length: EMAIL_MAX_LENGTH }).notNull().unique(),
    id: text("id").primaryKey(),
    locale: text("locale", { enum: I18N.SUPPORTED_LOCALES }).notNull().default(I18N.DEFAULT_LOCALE),
    source: text("source", { enum: NEWSLETTER_SOURCES }).notNull().default("footer"),
    status: text("status", { enum: NEWSLETTER_STATUSES }).notNull().default("pending"),
    subscribedAt: integer("subscribed_at", { mode: "timestamp_ms" }),
    unsubscribeToken: text("unsubscribe_token", { length: NEWSLETTER_TOKEN_LENGTH }).notNull().unique(),
    unsubscribedAt: integer("unsubscribed_at", { mode: "timestamp_ms" }),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(unixepoch() * 1000)`)
      .$onUpdate(
        () =>
          /* @__PURE__ */
          new Date(),
      )
      .notNull(),
  },
  (table) => [index("newsletter_subscriber_status_locale_idx").on(table.status, table.locale)],
)
