import { env } from "cloudflare:workers"

import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"
import { v7 } from "uuid"

import { RATE_LIMIT_WINDOW_SECONDS, authorized, withRateLimit } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { BUSINESS_PROFILE_ID, BUSINESS_PROFILE_MUTATION_KEYS } from "~/src/modules/business-profile/business-profile.constants"
import { BUSINESS_LOGO_UPLOADS_PER_MINUTE, logoObjectKey } from "~/src/modules/business-profile/business-profile.logo"
import { businessProfile } from "~/src/modules/business-profile/business-profile.schema"
import type { BusinessProfile } from "~/src/modules/business-profile/business-profile.types"
import { businessProfileZodSchemas } from "~/src/modules/business-profile/business-profile.zod"

const UPLOAD_RATE_LIMIT = { max: BUSINESS_LOGO_UPLOADS_PER_MINUTE, window: RATE_LIMIT_WINDOW_SECONDS } as const

export const uploadBusinessLogo = createServerFn({ method: "POST" })
  .middleware([withRateLimit("upload-business-logo", UPLOAD_RATE_LIMIT), authorized({ settings: ["manage"] })])
  .validator((input: BusinessProfile["uploadBusinessLogo"]) => businessProfileZodSchemas.uploadBusinessLogo.parse(input))
  .handler(async ({ data: { extension, image } }) => {
    const [profile] = await db
      .select({ logo: businessProfile.logo })
      .from(businessProfile)
      .where(eq(businessProfile.id, BUSINESS_PROFILE_ID))
      .limit(1)

    if (profile === undefined) {
      throw new AppError(ERROR_CODES.NOT_FOUND)
    }

    const logo = logoObjectKey({ extension, logoId: v7() })
    await env.MEDIA.put(logo, image, { httpMetadata: { contentType: image.type } })

    const [updated] = await db
      .update(businessProfile)
      .set({ logo })
      .where(eq(businessProfile.id, BUSINESS_PROFILE_ID))
      .returning({ logo: businessProfile.logo })

    if (updated === undefined) {
      await env.MEDIA.delete(logo)
      throw new AppError(ERROR_CODES.NOT_FOUND)
    }

    if (profile.logo !== null) {
      await env.MEDIA.delete(profile.logo)
    }

    return updated
  })

export const uploadBusinessLogoMutation = mutationOptions({
  mutationFn: (data: BusinessProfile["uploadBusinessLogo"]) => uploadBusinessLogo({ data }),
  mutationKey: BUSINESS_PROFILE_MUTATION_KEYS.UPLOAD_LOGO,
})
