import zod from "zod/v4"

import { localeField } from "~/src/modules/_core/utils/zod-fields"
import { LICENSE_TIERS } from "~/src/modules/license/license.constants"

const startCheckout = zod.object({
  locale: localeField,
  tier: zod.enum(LICENSE_TIERS),
})

const deactivateLicense = zod.object({
  activationId: zod.uuid(),
})

export const licenseZodSchemas = {
  deactivateLicense,
  startCheckout,
}
