import * as zod from "zod"

import { LICENSE_TIER } from "~/src/modules/license/license.constants"

import { searchParam } from "~/src/lib/search-params"

export const licenseSearchSchema = zod.object({
  checkoutId: searchParam(zod.uuid()),
  tier: searchParam(zod.enum(LICENSE_TIER)),
})

export const USER_LICENSE_DETAILS = ["tier", "status", "purchasedAt", "withdrawalConsent", "firstActivation", "firstDownload"] as const
