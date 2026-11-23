import * as zod from "zod"

import { callbackPathSchema } from "~/src/integrations/better-auth/auth.zod"

import { DEFAULT_PAGE_SIZE } from "~/src/modules/_core/utils/pagination"
import { MIN_FIELD_LENGTH, idField, localeField } from "~/src/modules/_core/utils/zod-fields"
import { LICENSE_TIERS } from "~/src/modules/license/license.constants"

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
