import { env } from "cloudflare:workers"

import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { eq, sql } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { BUSINESS_PROFILE_ID, BUSINESS_PROFILE_MUTATION_KEYS } from "~/src/modules/business-profile/business-profile.constants"
import { businessProfile } from "~/src/modules/business-profile/business-profile.schema"

export const removeBusinessLogo = createServerFn({ method: "POST" })
  .middleware([authorized({ settings: ["manage"] })])
  .handler(async () => {
    const [profile] = await db
      .select({ logo: businessProfile.logo })
      .from(businessProfile)
      .where(eq(businessProfile.id, BUSINESS_PROFILE_ID))
      .limit(1)

    if (profile === undefined) {
      throw new AppError(ERROR_CODES.NOT_FOUND)
    }

    if (profile.logo !== null) {
      await db
        .update(businessProfile)
        .set({ logo: sql`null` })
        .where(eq(businessProfile.id, BUSINESS_PROFILE_ID))
      await env.MEDIA.delete(profile.logo)
    }

    return { id: BUSINESS_PROFILE_ID }
  })

export const removeBusinessLogoMutation = mutationOptions({
  mutationFn: () => removeBusinessLogo(),
  mutationKey: BUSINESS_PROFILE_MUTATION_KEYS.REMOVE_LOGO,
})
