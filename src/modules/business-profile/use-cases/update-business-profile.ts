import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { BUSINESS_PROFILE_ID, BUSINESS_PROFILE_MUTATION_KEYS } from "~/src/modules/business-profile/business-profile.constants"
import { businessProfile } from "~/src/modules/business-profile/business-profile.schema"
import type { BusinessProfile } from "~/src/modules/business-profile/business-profile.types"
import { businessProfileZodSchemas } from "~/src/modules/business-profile/business-profile.zod"

export const updateBusinessProfile = createServerFn({ method: "POST" })
  .middleware([authorized({ settings: ["manage"] })])
  .validator((input: BusinessProfile["updateBusinessProfile"]) => businessProfileZodSchemas.updateBusinessProfile.parse(input))
  .handler(async ({ data }) => {
    const [updated] = await db
      .update(businessProfile)
      .set(data)
      .where(eq(businessProfile.id, BUSINESS_PROFILE_ID))
      .returning({ address: businessProfile.address, name: businessProfile.name, supportEmail: businessProfile.supportEmail })

    if (updated === undefined) {
      throw new AppError(ERROR_CODES.NOT_FOUND)
    }

    return updated
  })

export const updateBusinessProfileMutation = mutationOptions({
  mutationFn: (data: BusinessProfile["updateBusinessProfile"]) => updateBusinessProfile({ data }),
  mutationKey: BUSINESS_PROFILE_MUTATION_KEYS.UPDATE,
})
