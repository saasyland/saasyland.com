import "@tanstack/react-start/server-only"

import { env, waitUntil } from "cloudflare:workers"

import { checkout, polar as polarPlugin, portal, webhooks } from "@polar-sh/better-auth"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { createEmailVerificationToken } from "better-auth/api"
import { admin } from "better-auth/plugins/admin"
import { twoFactor } from "better-auth/plugins/two-factor"
import { tanstackStartCookies } from "better-auth/tanstack-start"
import { v7 as uuidv7 } from "uuid"
import zod from "zod/v4"

import { DEFAULT_ROLE_CODE, ROLES, ROLE_CODES, ac } from "~/src/integrations/better-auth/auth.access"
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "~/src/integrations/better-auth/auth.constraints"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import * as schema from "~/src/integrations/drizzle-orm/drizzle.schemas"
import { polar } from "~/src/integrations/polar/polar.config"
import { POLAR_CHECKOUT_PRODUCTS } from "~/src/integrations/polar/polar.constants"
import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { extractLocaleFromCallbackURL, extractLocaleFromPath } from "~/src/integrations/use-intl/i18n.paths"

import { IP_ADDRESS_HEADER, appHostsForMode, isLocalMode } from "~/src/modules/_core/constants/api"
import { sendChangeEmailConfirmationEmail } from "~/src/modules/account/use-cases/send-change-email-confirmation-email"
import { licenseWebhookHandlers } from "~/src/modules/license/license.webhooks"
import { TIMEZONE_CODES } from "~/src/modules/user/user.schema"
import { sendResetPasswordEmail } from "~/src/modules/verification/use-cases/send-reset-password-email"
import { sendVerifyEmail } from "~/src/modules/verification/use-cases/send-verify-email"

import { authRateLimitStorage } from "~/src/lib/rate-limit"

import { APP_NAME } from "~/src/presentation/branding"
import { ROUTES } from "~/src/routes"

const FORM_CONTENT_TYPE = "application/x-www-form-urlencoded"

const signUpCallbackSchema = zod.object({ callbackURL: zod.string() })

// Better Auth hands over a copy of the sign-up request, sent as JSON or a form, whose `callbackURL` names the sign-up page.
const readSignUpLocale = async (request: Request | undefined): Promise<SupportedLocale | undefined> => {
  if (!request?.body) {
    return undefined
  }
  const body: unknown =
    request.headers.get("content-type")?.toLowerCase().includes(FORM_CONTENT_TYPE) === true
      ? Object.fromEntries(await request.formData())
      : await request.json()
  const signUp = signUpCallbackSchema.safeParse(body)
  const pathname = signUp.success ? URL.parse(signUp.data.callbackURL, request.url)?.pathname : undefined

  return pathname === undefined ? undefined : extractLocaleFromPath(pathname)
}

export const auth = betterAuth({
  account: {
    accountLinking: { enabled: true },
    encryptOAuthTokens: true,
  },
  advanced: {
    backgroundTasks: { handler: waitUntil },
    cookiePrefix: "saasyland",
    database: { generateId: () => uuidv7(), joins: true },
    ipAddress: { ipAddressHeaders: [IP_ADDRESS_HEADER] },
    useSecureCookies: !isLocalMode(import.meta.env.MODE),
  },
  appName: APP_NAME,
  baseURL: { allowedHosts: appHostsForMode(import.meta.env.MODE) },
  database: drizzleAdapter(db, { provider: "sqlite", schema }),
  emailAndPassword: {
    enabled: true,
    maxPasswordLength: PASSWORD_MAX_LENGTH,
    minPasswordLength: PASSWORD_MIN_LENGTH,
    onExistingUserSignUp: async ({ user }, request) => {
      if (!user.emailVerified) {
        await sendVerifyEmail({
          locale: (await readSignUpLocale(request)) ?? I18N.DEFAULT_LOCALE,
          token: await createEmailVerificationToken(env.AUTH_SECRET, user.email),
          user,
        })
      }
    },
    requireEmailVerification: true,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: sendResetPasswordEmail,
  },
  emailVerification: {
    autoSignInAfterVerification: true,
    sendOnSignUp: true,
    sendVerificationEmail: ({ token, url, user }) =>
      sendVerifyEmail({ locale: extractLocaleFromCallbackURL(url) ?? I18N.DEFAULT_LOCALE, token, user }),
  },
  onAPIError: { errorURL: ROUTES.SIGN_IN },
  plugins: [
    admin({ ac, adminRoles: [ROLE_CODES.ADMIN], defaultRole: DEFAULT_ROLE_CODE, roles: ROLES }),
    polarPlugin({
      client: polar,
      use: [
        checkout({
          authenticatedUsersOnly: true,
          products: POLAR_CHECKOUT_PRODUCTS,
          successUrl: ROUTES.APP,
        }),
        portal(),
        webhooks({ ...licenseWebhookHandlers, secret: env.POLAR_WEBHOOK_SECRET }),
      ],
    }),
    twoFactor({ issuer: APP_NAME }),
    tanstackStartCookies(),
  ],
  rateLimit: {
    customRules: {
      [ROUTES.API_AUTH.GET_SESSION]: false,
      [ROUTES.API_AUTH.POLAR_WEBHOOKS]: false,
      [ROUTES.API_AUTH.SIGN_OUT]: false,
    },
    customStorage: authRateLimitStorage,
    enabled: true,
  },
  secret: env.AUTH_SECRET,
  socialProviders: {
    github: { clientId: env.AUTH_GITHUB_CLIENT_ID, clientSecret: env.AUTH_GITHUB_CLIENT_SECRET },
    google: { clientId: env.AUTH_GOOGLE_CLIENT_ID, clientSecret: env.AUTH_GOOGLE_CLIENT_SECRET },
  },
  user: {
    additionalFields: {
      timezone: {
        defaultValue: I18N.DEFAULT_TIMEZONE,
        input: true,
        required: false,
        type: [...TIMEZONE_CODES],
        validator: { input: zod.enum(TIMEZONE_CODES) },
      },
    },
    changeEmail: {
      enabled: true,
      sendChangeEmailConfirmation: sendChangeEmailConfirmationEmail,
    },
  },
  verification: { storeIdentifier: "hashed" },
})
