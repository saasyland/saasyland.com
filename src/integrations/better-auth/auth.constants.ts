import { SECONDS_PER_HOUR } from "~/src/lib/duration"

import { APP_SLUG } from "~/src/presentation/branding"

export const AUTH_PROVIDER = {
  CREDENTIAL: "credential",
  GITHUB: "github",
  GOOGLE: "google",
} as const

export const EMAIL_LINK_LIFETIME_HOURS = 1
export const EMAIL_LINK_LIFETIME_SECONDS = EMAIL_LINK_LIFETIME_HOURS * SECONDS_PER_HOUR

export const LOGIN_METHOD = {
  EMAIL: "email",
  GITHUB: AUTH_PROVIDER.GITHUB,
  GOOGLE: AUTH_PROVIDER.GOOGLE,
} as const

export const LAST_LOGIN_METHOD_COOKIE = `${APP_SLUG}.last_used_login_method`
