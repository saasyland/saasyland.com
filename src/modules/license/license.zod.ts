import zod from "zod/v4"

import { idField, localeField } from "~/src/modules/_core/utils/zod-fields"
import { LICENSE_TIERS } from "~/src/modules/license/license.constants"

const startCheckout = zod.object({
  locale: localeField,
  tier: zod.enum(LICENSE_TIERS),
})

const deactivateLicense = zod.object({
  activationId: zod.uuid(),
})

const getUserLicense = zod.object({
  userId: idField,
})

export const licenseZodSchemas = {
  deactivateLicense,
  getUserLicense,
  startCheckout,
}
