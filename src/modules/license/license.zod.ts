import zod from "zod/v4"

import { callbackPathSchema } from "~/src/integrations/better-auth/auth.zod"

import { idField, localeField } from "~/src/modules/_core/utils/zod-fields"
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

const getUpgradePrice = zod.object({
  tier: zod.enum(LICENSE_TIERS),
})

export const licenseZodSchemas = {
  deactivateLicense,
  getUpgradePrice,
  getUserLicense,
  startCheckout,
}
