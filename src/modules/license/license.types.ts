import type * as zod from "zod"

import type { license } from "~/src/modules/license/license.schema"
import type { licenseZodSchemas } from "~/src/modules/license/license.zod"
import type { getUnlicensedOrders } from "~/src/modules/license/use-cases/get-unlicensed-orders"
import type { getUserLicense } from "~/src/modules/license/use-cases/get-user-license"

export interface License {
  select: typeof license.$inferSelect
  insert: typeof license.$inferInsert
  userLicense: Awaited<ReturnType<typeof getUserLicense>>["license"]
  unlicensedOrder: Awaited<ReturnType<typeof getUnlicensedOrders>>["rows"][number]
  deactivateLicense: zod.input<typeof licenseZodSchemas.deactivateLicense>
  getUserLicense: zod.input<typeof licenseZodSchemas.getUserLicense>
  startCheckout: zod.input<typeof licenseZodSchemas.startCheckout>
}
