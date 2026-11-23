import { sql } from "drizzle-orm"
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core"

import { EMAIL_MAX_LENGTH } from "~/src/integrations/better-auth/auth.constraints"
import { ROLE_VALUES } from "~/src/integrations/better-auth/auth.roles"
import { timestamps } from "~/src/integrations/drizzle-orm/drizzle.columns"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { INVITATION_TOKEN_LENGTH } from "~/src/modules/invitation/invitation.constants"
import { user } from "~/src/modules/user/user.schema"

export const invitation = sqliteTable(
  "invitation",
  {
    acceptedAt: integer("accepted_at", { mode: "timestamp_ms" }),
    acceptedBy: text("accepted_by").references(() => user.id, { onDelete: "set null" }),
    email: text("email", { length: EMAIL_MAX_LENGTH }).notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    id: text("id").primaryKey(),
    invitedBy: text("invited_by").references(() => user.id, { onDelete: "set null" }),
    locale: text("locale", { enum: I18N.SUPPORTED_LOCALES }).notNull(),
    revokedAt: integer("revoked_at", { mode: "timestamp_ms" }),
    revokedBy: text("revoked_by").references(() => user.id, { onDelete: "set null" }),
    role: text("role", { enum: ROLE_VALUES }).notNull(),
    sentAt: integer("sent_at", { mode: "timestamp_ms" }).notNull(),
    tokenHash: text("token_hash", { length: INVITATION_TOKEN_LENGTH }).notNull().unique(),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("invitation_open_email_uidx")
      .on(table.email)
      .where(sql`${table.acceptedAt} is null and ${table.revokedAt} is null`),
    index("invitation_created_at_idx").on(table.createdAt),
  ],
)
