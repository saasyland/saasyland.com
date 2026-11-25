import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { BUSINESS_PROFILE_ID, BUSINESS_PROFILE_QUERY_KEYS } from "~/src/modules/business-profile/business-profile.constants"
import { businessProfile } from "~/src/modules/business-profile/business-profile.schema"

export const getBusinessProfile = createServerFn({ method: "GET" })
  .middleware([authorized({ settings: ["manage"] })])
  .handler(async () => {
    const [profile] = await db
      .select({
        address: businessProfile.address,
        logo: businessProfile.logo,
        name: businessProfile.name,
        supportEmail: businessProfile.supportEmail,
      })
      .from(businessProfile)
      .where(eq(businessProfile.id, BUSINESS_PROFILE_ID))
      .limit(1)

    if (profile === undefined) {
      throw new AppError(ERROR_CODES.NOT_FOUND)
    }

    return profile
  })

export const businessProfileQuery = queryOptions({
  queryFn: () => getBusinessProfile(),
  queryKey: BUSINESS_PROFILE_QUERY_KEYS.DETAIL,
})
