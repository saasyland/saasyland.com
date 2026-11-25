import type * as zod from "zod"

import type { businessProfile } from "~/src/modules/business-profile/business-profile.schema"
import type { businessProfileZodSchemas } from "~/src/modules/business-profile/business-profile.zod"
import type { getBusinessProfile } from "~/src/modules/business-profile/use-cases/get-business-profile"

export interface BusinessProfile {
  select: typeof businessProfile.$inferSelect
  insert: typeof businessProfile.$inferInsert
  detail: Awaited<ReturnType<typeof getBusinessProfile>>
  businessLogoSource: zod.input<typeof businessProfileZodSchemas.businessLogoSource>
  updateBusinessProfile: zod.input<typeof businessProfileZodSchemas.updateBusinessProfile>
  uploadBusinessLogo: zod.input<typeof businessProfileZodSchemas.uploadBusinessLogo>
}
