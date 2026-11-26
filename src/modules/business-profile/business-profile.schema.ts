import { sqliteTable, text } from "drizzle-orm/sqlite-core"

import { EMAIL_MAX_LENGTH } from "~/src/integrations/better-auth/auth.constraints"
import { timestamps } from "~/src/integrations/drizzle-orm/drizzle.columns"

import {
  BUSINESS_ADDRESS_MAX_LENGTH,
  BUSINESS_NAME_MAX_LENGTH,
  BUSINESS_PROFILE_ID,
} from "~/src/modules/business-profile/business-profile.constants"

import { APP_NAME, CONTACT_EMAIL } from "~/src/presentation/branding"

export const businessProfile = sqliteTable("business_profile", {
  address: text("address", { length: BUSINESS_ADDRESS_MAX_LENGTH }).notNull().default(""),
  id: text("id").primaryKey().default(BUSINESS_PROFILE_ID),
  logo: text("logo"),
  name: text("name", { length: BUSINESS_NAME_MAX_LENGTH }).notNull().default(APP_NAME),
  supportEmail: text("support_email", { length: EMAIL_MAX_LENGTH }).notNull().default(CONTACT_EMAIL),
  ...timestamps(),
})
