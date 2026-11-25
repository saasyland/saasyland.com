import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

import { timestamps } from "~/src/integrations/drizzle-orm/drizzle.columns"

import type { LocalizedText } from "~/src/modules/_core/utils/localized-text"
import { NEWSLETTER_ISSUE_STATUS, NEWSLETTER_ISSUE_STATUSES } from "~/src/modules/newsletter-issue/newsletter-issue.constants"

export const newsletterIssue = sqliteTable(
  "newsletter_issue",
  {
    body: text("body", { mode: "json" }).$type<LocalizedText>().notNull(),
    id: text("id").primaryKey(),
    lastRecipientId: text("last_recipient_id"),
    leaseExpiresAt: integer("lease_expires_at", { mode: "timestamp_ms" }),
    recipientCount: integer("recipient_count").notNull(),
    sentAt: integer("sent_at", { mode: "timestamp_ms" }),
    sentCount: integer("sent_count").notNull().default(0),
    status: text("status", { enum: NEWSLETTER_ISSUE_STATUSES }).notNull().default(NEWSLETTER_ISSUE_STATUS.SENDING),
    subject: text("subject", { mode: "json" }).$type<LocalizedText>().notNull(),
    ...timestamps(),
  },
  (table) => [index("newsletter_issue_created_at_idx").on(table.createdAt)],
)
