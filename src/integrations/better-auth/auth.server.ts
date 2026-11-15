import "@tanstack/react-start/server-only"

import { env, waitUntil } from "cloudflare:workers"

import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { createEmailVerificationToken } from "better-auth/api"
import { admin } from "better-auth/plugins/admin"
import { twoFactor } from "better-auth/plugins/two-factor"
import { tanstackStartCookies } from "better-auth/tanstack-start"
import { v7 as uuidv7 } from "uuid"
import zod from "zod/v4"

import { ROLES, ac } from "~/src/integrations/better-auth/auth.access"
import { AUTH_PROVIDER } from "~/src/integrations/better-auth/auth.constants"
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "~/src/integrations/better-auth/auth.constraints"
import { enforceInputPolicy } from "~/src/integrations/better-auth/auth.hooks"
import { DEFAULT_ROLE_CODE, ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import * as schema from "~/src/integrations/drizzle-orm/drizzle.schemas"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { IP_ADDRESS_HEADER, appHostsForMode, isLocalMode } from "~/src/modules/_core/constants/api"
import { TIMEZONE_CODES } from "~/src/modules/user/user.schema"

import { AUTH_EMAILS } from "~/src/data/auth-emails"
import { AUTH_PLUGINS, DISABLED_AUTH_PATHS, RATE_LIMIT_EXEMPT_AUTH_PATHS } from "~/src/data/auth-plugins"

import { consumeRateLimit } from "~/src/lib/rate-limit"

import { APP_NAME, APP_SLUG } from "~/src/presentation/branding"
import { ROUTES } from "~/src/routes"

const FORM_CONTENT_TYPE = "application/x-www-form-urlencoded"
const RATE_LIMIT_KEY_PREFIX = "auth:"

const signUpCallbackSchema = zod.object({ callbackURL: zod.string() })

const readSignUpCallbackURL = async (request: Request | undefined): Promise<string> => {
  if (!request?.body) {
    return ROUTES.AUTH_CALLBACK
  }
  const isForm = request.headers.get("content-type")?.toLowerCase().includes(FORM_CONTENT_TYPE) === true
  const body: unknown = isForm ? Object.fromEntries(await request.formData()) : await request.json()

  return signUpCallbackSchema.safeParse(body).data?.callbackURL ?? ROUTES.AUTH_CALLBACK
}

const readVerificationCallbackURL = (verificationLink: string): string =>
  new URL(verificationLink).searchParams.get("callbackURL") ?? ROUTES.AUTH_CALLBACK

export const auth = betterAuth({
  account: {
    accountLinking: { enabled: true },
    encryptOAuthTokens: true,
  },
  advanced: {
    backgroundTasks: { handler: waitUntil },
    cookiePrefix: APP_SLUG,
    database: { generateId: () => uuidv7(), joins: true },
    ipAddress: { ipAddressHeaders: [IP_ADDRESS_HEADER] },
    useSecureCookies: !isLocalMode(import.meta.env.MODE),
  },
  appName: APP_NAME,
  baseURL: { allowedHosts: appHostsForMode(import.meta.env.MODE) },
  database: drizzleAdapter(db, { provider: "sqlite", schema }),
  disabledPaths: DISABLED_AUTH_PATHS,
  emailAndPassword: {
    enabled: true,
    maxPasswordLength: PASSWORD_MAX_LENGTH,
    minPasswordLength: PASSWORD_MIN_LENGTH,
    onExistingUserSignUp: async ({ user }, request) => {
      if (!user.emailVerified) {
        await AUTH_EMAILS.sendVerification({
          callbackURL: await readSignUpCallbackURL(request),
          token: await createEmailVerificationToken(env.AUTH_SECRET, user.email),
          user,
        })
      }
    },
    requireEmailVerification: true,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: AUTH_EMAILS.sendResetPassword,
  },
  emailVerification: {
    autoSignInAfterVerification: true,
    sendOnSignUp: true,
    sendVerificationEmail: ({ token, url, user }) =>
      AUTH_EMAILS.sendVerification({ callbackURL: readVerificationCallbackURL(url), token, user }),
  },
  hooks: { before: enforceInputPolicy },
  onAPIError: { errorURL: ROUTES.SIGN_IN },
  plugins: [
    admin({ ac, adminRoles: [ROLE_CODES.ADMIN], defaultRole: DEFAULT_ROLE_CODE, roles: ROLES }),
    twoFactor({ issuer: APP_NAME }),
    ...AUTH_PLUGINS,
    tanstackStartCookies(),
  ],
  rateLimit: {
    customRules: {
      [ROUTES.API_AUTH.GET_SESSION]: false,
      [ROUTES.API_AUTH.SIGN_OUT]: false,
      ...Object.fromEntries(RATE_LIMIT_EXEMPT_AUTH_PATHS.map((path) => [path, false] as const)),
    },
    customStorage: {
      consume: (key, { max, window }) => consumeRateLimit({ key: `${RATE_LIMIT_KEY_PREFIX}${key}`, limit: max, windowSeconds: window }),
    },
    enabled: true,
  },
  secret: env.AUTH_SECRET,
  socialProviders: {
    [AUTH_PROVIDER.GITHUB]: { clientId: env.AUTH_GITHUB_CLIENT_ID, clientSecret: env.AUTH_GITHUB_CLIENT_SECRET },
    [AUTH_PROVIDER.GOOGLE]: { clientId: env.AUTH_GOOGLE_CLIENT_ID, clientSecret: env.AUTH_GOOGLE_CLIENT_SECRET },
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
      sendChangeEmailConfirmation: AUTH_EMAILS.sendChangeEmailConfirmation,
    },
  },
  verification: { storeIdentifier: "hashed" },
})
