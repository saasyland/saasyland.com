import * as zod from "zod"

import { callbackPathSchema } from "~/src/integrations/better-auth/auth.zod"
import { deLocalizePathname } from "~/src/integrations/use-intl/i18n.paths"

import { LICENSE_TIER } from "~/src/modules/license/license.constants"

import { searchParam } from "~/src/lib/search-params"

import { APP_URL } from "~/src/presentation/branding"
import { ROUTES } from "~/src/routes"

export const licenseSearchSchema = zod.object({
  checkoutId: searchParam(zod.uuid()),
  redirect: searchParam(callbackPathSchema),
  tier: searchParam(zod.enum(LICENSE_TIER)),
})

const TIER_PAGES = new Set<string>([ROUTES.APP, ROUTES.APP_LICENSE])

export const redirectTierSchema = callbackPathSchema
  .transform((redirect) => {
    const { pathname, searchParams } = new URL(redirect, APP_URL)

    return TIER_PAGES.has(deLocalizePathname(pathname)) ? licenseSearchSchema.parse(Object.fromEntries(searchParams)).tier : undefined
  })
  .pipe(zod.enum(LICENSE_TIER))

export const PURCHASE_STEP = {
  ACCOUNT: 1,
  PAYMENT: 2,
} as const

export const PURCHASE_STEP_COUNT = Object.keys(PURCHASE_STEP).length

export const USER_LICENSE_DETAILS = ["tier", "status", "purchasedAt", "withdrawalConsent", "firstActivation", "firstDownload"] as const
