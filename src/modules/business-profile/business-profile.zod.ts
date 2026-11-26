import * as zod from "zod"

import { emailSchema } from "~/src/integrations/better-auth/auth.zod"

import { MIN_FIELD_LENGTH } from "~/src/modules/_core/utils/zod-fields"
import { BUSINESS_ADDRESS_MAX_LENGTH, BUSINESS_NAME_MAX_LENGTH } from "~/src/modules/business-profile/business-profile.constants"
import {
  BUSINESS_LOGO_MAX_BYTES,
  BUSINESS_LOGO_SOURCE_TYPES,
  logoEntries,
  logoExtension,
} from "~/src/modules/business-profile/business-profile.logo"

const updateBusinessProfile = zod.object({
  address: zod.string().trim().max(BUSINESS_ADDRESS_MAX_LENGTH, { message: "addressMaxLength" }),
  name: zod.string().trim().min(MIN_FIELD_LENGTH, { message: "nameRequired" }).max(BUSINESS_NAME_MAX_LENGTH, { message: "nameMaxLength" }),
  supportEmail: zod.string().trim().pipe(emailSchema),
})

const logoImage = zod
  .file({ message: "fileRequired" })
  .min(MIN_FIELD_LENGTH, { message: "fileRequired" })
  .max(BUSINESS_LOGO_MAX_BYTES, { message: "logoTooLarge" })

const businessLogoSource = zod.object({
  file: logoImage.mime(Object.values(BUSINESS_LOGO_SOURCE_TYPES), { message: "logoTypeUnsupported" }),
})

const uploadBusinessLogo = zod
  .instanceof(FormData)
  .transform((form) => logoEntries(form))
  .pipe(zod.object({ image: logoImage }))
  .transform(({ image }, context) => {
    const extension = logoExtension(image.type)
    if (extension === undefined) {
      context.addIssue({ code: "custom", input: image, message: "logoTypeUnsupported" })
      return zod.NEVER
    }

    return { extension, image }
  })

export const businessProfileZodSchemas = {
  businessLogoSource,
  updateBusinessProfile,
  uploadBusinessLogo,
}
