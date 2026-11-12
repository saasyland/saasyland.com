import type * as zod from "zod"

import type { license } from "~/src/modules/license/license.schema"
import type { licenseZodSchemas } from "~/src/modules/license/license.zod"

export interface License {
  select: typeof license.$inferSelect
  insert: typeof license.$inferInsert
  deactivateLicense: zod.input<typeof licenseZodSchemas.deactivateLicense>
  startCheckout: zod.input<typeof licenseZodSchemas.startCheckout>
}
