import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

import { EMAIL_MAX_LENGTH, NAME_MAX_LENGTH } from "~/src/integrations/better-auth/auth.constraints"
import { timestamps } from "~/src/integrations/drizzle-orm/drizzle.columns"
import { POLAR_ID_MAX_LENGTH } from "~/src/integrations/polar/polar.constants"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { license } from "~/src/modules/license/license.schema"
import { user } from "~/src/modules/user/user.schema"
import {
  WITHDRAWAL_CHANNELS,
  WITHDRAWAL_ELIGIBILITIES,
  WITHDRAWAL_REFERENCE_MAX_LENGTH,
} from "~/src/modules/withdrawal/withdrawal.constants"

export const withdrawal = sqliteTable(
  "withdrawal",
  {
    acknowledgedAt: integer("acknowledged_at", { mode: "timestamp_ms" }),
    channel: text("channel", { enum: WITHDRAWAL_CHANNELS }).notNull(),
    eligibility: text("eligibility", { enum: WITHDRAWAL_ELIGIBILITIES }).notNull(),
    email: text("email", { length: EMAIL_MAX_LENGTH }).notNull(),
    id: text("id").primaryKey(),
    licenseId: text("license_id").references(() => license.id, { onDelete: "set null" }),
    locale: text("locale", { enum: I18N.SUPPORTED_LOCALES }).notNull(),
    name: text("name", { length: NAME_MAX_LENGTH }).notNull(),
    polarOrderId: text("polar_order_id", { length: POLAR_ID_MAX_LENGTH }),
    reference: text("reference", { length: WITHDRAWAL_REFERENCE_MAX_LENGTH }).notNull(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    ...timestamps(),
  },
  (table) => [index("withdrawal_user_created_at_idx").on(table.userId, table.createdAt)],
)
