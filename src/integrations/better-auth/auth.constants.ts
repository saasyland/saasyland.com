import { SECONDS_PER_HOUR } from "~/src/lib/duration"

export const AUTH_PROVIDER = {
  CREDENTIAL: "credential",
  GITHUB: "github",
  GOOGLE: "google",
} as const

export const EMAIL_LINK_LIFETIME_HOURS = 1
export const EMAIL_LINK_LIFETIME_SECONDS = EMAIL_LINK_LIFETIME_HOURS * SECONDS_PER_HOUR
