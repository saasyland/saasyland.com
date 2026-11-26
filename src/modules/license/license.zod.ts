import * as zod from "zod"

import { callbackPathSchema } from "~/src/integrations/better-auth/auth.zod"
import { deLocalizePathname } from "~/src/integrations/use-intl/i18n.paths"

import { DEFAULT_PAGE_SIZE } from "~/src/modules/_core/utils/pagination"
import { MIN_FIELD_LENGTH, idField, localeField } from "~/src/modules/_core/utils/zod-fields"
import { LICENSE_TIER, LICENSE_TIERS } from "~/src/modules/license/license.constants"

import { searchParam } from "~/src/lib/search-params"

import { APP_URL } from "~/src/presentation/branding"
import { ROUTES } from "~/src/routes"

const startCheckout = zod.object({
  locale: localeField,
  redirect: callbackPathSchema.optional(),
  returnPath: callbackPathSchema,
  tier: zod.enum(LICENSE_TIERS),
})

const deactivateLicense = zod.object({
  activationId: zod.uuid(),
})

const getUserLicense = zod.object({
  userId: idField,
})

const getUserActivations = zod.object({
  userIds: zod.array(idField).min(MIN_FIELD_LENGTH).max(DEFAULT_PAGE_SIZE),
})

const getUpgradePrice = zod.object({
  tier: zod.enum(LICENSE_TIERS),
})

export const licenseZodSchemas = {
  deactivateLicense,
  getUpgradePrice,
  getUserActivations,
  getUserLicense,
  startCheckout,
}

export const licenseSearchSchema = zod.object({
  checkoutId: searchParam(zod.uuid()),
  redirect: searchParam(callbackPathSchema),
  tier: searchParam(zod.enum(LICENSE_TIER)),
})

const TIER_PAGES = new Set<string>([ROUTES.APP.INDEX, ROUTES.APP.LICENSE])

export const redirectTierSchema = callbackPathSchema
  .transform((redirect) => new URL(redirect, APP_URL))
  .refine(({ pathname }) => TIER_PAGES.has(deLocalizePathname(pathname)))
  .transform(({ searchParams }) => licenseSearchSchema.parse(Object.fromEntries(searchParams)).tier)
  .pipe(zod.enum(LICENSE_TIER))
