import { EMAIL_MAX_LENGTH } from "~/src/integrations/better-auth/auth.constraints"

import { BUSINESS_LOGO_MAX_MEGABYTES } from "~/src/modules/business-profile/business-profile.logo"

export const BUSINESS_PROFILE_ID = "business"

export const BUSINESS_NAME_MAX_LENGTH = 120

export const BUSINESS_ADDRESS_MAX_LENGTH = 500

export const BUSINESS_PROFILE_VALIDATION_PARAMS: Record<string, Record<string, number>> = {
  addressMaxLength: { max: BUSINESS_ADDRESS_MAX_LENGTH },
  emailMaxLength: { max: EMAIL_MAX_LENGTH },
  logoTooLarge: { max: BUSINESS_LOGO_MAX_MEGABYTES },
  nameMaxLength: { max: BUSINESS_NAME_MAX_LENGTH },
}

export const BUSINESS_PROFILE_QUERY_KEYS = {
  ALL: ["business-profile"],
  DETAIL: ["business-profile", "getBusinessProfile"],
} as const

export const BUSINESS_PROFILE_MUTATION_KEYS = {
  REMOVE_LOGO: ["business-profile", "removeBusinessLogo"],
  UPDATE: ["business-profile", "updateBusinessProfile"],
  UPLOAD_LOGO: ["business-profile", "uploadBusinessLogo"],
} as const
