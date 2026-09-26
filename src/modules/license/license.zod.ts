import { createSchemaFactory } from "drizzle-zod"
import zod from "zod/v4"

import { LICENSE_TIERS, license } from "~/src/modules/license/license.schema"

const { createInsertSchema, createSelectSchema, createUpdateSchema } = createSchemaFactory({ zodInstance: zod })

const startCheckout = zod.object({
  tier: zod.enum(LICENSE_TIERS),
})

const deactivateLicense = zod.object({
  activationId: zod.uuid(),
})

const insert = createInsertSchema(license)
const select = createSelectSchema(license)
const update = createUpdateSchema(license)

export const licenseZodSchemas = {
  deactivateLicense,
  insert,
  select,
  startCheckout,
  update,
}
