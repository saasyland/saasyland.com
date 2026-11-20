import "@tanstack/react-start/server-only"

import { env, waitUntil } from "cloudflare:workers"

import { getRequest } from "@tanstack/react-start/server"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { createEmailVerificationToken } from "better-auth/api"
import { admin } from "better-auth/plugins/admin"
import { twoFactor } from "better-auth/plugins/two-factor"
import { tanstackStartCookies } from "better-auth/tanstack-start"
import { v7 as uuidv7 } from "uuid"
import zod from "zod/v4"

import { ROLES, ac } from "~/src/integrations/better-auth/auth.access"
import { AUTH_PROVIDER, EMAIL_LINK_LIFETIME_SECONDS } from "~/src/integrations/better-auth/auth.constants"
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "~/src/integrations/better-auth/auth.constraints"
import { enforceInputPolicy } from "~/src/integrations/better-auth/auth.hooks"
import { DEFAULT_ROLE_CODE, ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import * as schema from "~/src/integrations/drizzle-orm/drizzle.schemas"
import { I18N } from "~/src/integrations/use-intl/i18n.config"
import { extractLocaleFromPath, localizePathname } from "~/src/integrations/use-intl/i18n.paths"

import { IP_ADDRESS_HEADER, appHostsForMode, isLocalMode } from "~/src/modules/_core/constants/api"
import { TIMEZONE_CODES } from "~/src/modules/user/user.constants"

import { AUTH_EMAILS } from "~/src/data/auth-emails"
import { AUTH_PLUGINS, RATE_LIMIT_EXEMPT_AUTH_PATHS } from "~/src/data/auth-plugins"

import { consumeRateLimit } from "~/src/lib/rate-limit"

import { APP_NAME, APP_SLUG } from "~/src/presentation/branding"
import { ROUTES } from "~/src/routes"

const FORM_CONTENT_TYPE = "application/x-www-form-urlencoded"
const RATE_LIMIT_KEY_PREFIX = "auth:"
const REFERER_HEADER = "referer"
const REDIRECT_PARAMETER = "redirect"
const UNNAMED_CALLBACK_URL = "/"

const signUpCallbackSchema = zod.object({ callbackURL: zod.string() })

const refererPage = (): URL | undefined => {
  const request = getRequest()
  const page = URL.parse(request.headers.get(REFERER_HEADER) ?? "")

  return page?.origin === new URL(request.url).origin ? page : undefined
}

const pageCallbackURL = (): string => {
  const page = refererPage()
  if (page === undefined) {
    return ROUTES.AUTH_CALLBACK
  }

  const callback = localizePathname({ locale: extractLocaleFromPath(page.pathname) ?? I18N.DEFAULT_LOCALE, pathname: ROUTES.AUTH_CALLBACK })
  const redirect = page.searchParams.get(REDIRECT_PARAMETER)

  return redirect === null ? callback : `${callback}?${new URLSearchParams({ [REDIRECT_PARAMETER]: redirect }).toString()}`
}

const readSignUpCallbackURL = async (request: Request | undefined): Promise<string> => {
  if (!request?.body) {
    return pageCallbackURL()
  }
  const isForm = request.headers.get("content-type")?.toLowerCase().includes(FORM_CONTENT_TYPE) === true
  const body: unknown = isForm ? Object.fromEntries(await request.formData()) : await request.json()

  return signUpCallbackSchema.safeParse(body).data?.callbackURL ?? pageCallbackURL()
}

const readVerificationCallbackURL = (verificationLink: string): string => {
  const callbackURL = new URL(verificationLink).searchParams.get("callbackURL")

  return callbackURL === null || callbackURL === UNNAMED_CALLBACK_URL ? pageCallbackURL() : callbackURL
}

const sendInBackground = (email: Promise<void>): Promise<void> => {
  waitUntil(
    email.catch((error: unknown) => {
      console.error("[email] an account email could not be sent", error)
    }),
  )

  return Promise.resolve()
}

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
  basePath: ROUTES.API_AUTH_BASE,
  baseURL: { allowedHosts: appHostsForMode(import.meta.env.MODE) },
  database: drizzleAdapter(db, { provider: "sqlite", schema }),
  emailAndPassword: {
    enabled: true,
    maxPasswordLength: PASSWORD_MAX_LENGTH,
    minPasswordLength: PASSWORD_MIN_LENGTH,
    onExistingUserSignUp: async ({ user }, request) => {
      const callbackURL = await readSignUpCallbackURL(request)

      if (user.emailVerified) {
        await AUTH_EMAILS.sendExistingAccount({ callbackURL, user })
        return
      }

      await AUTH_EMAILS.sendVerification({
        callbackURL,
        token: await createEmailVerificationToken(env.AUTH_SECRET, user.email, undefined, EMAIL_LINK_LIFETIME_SECONDS),
        user,
      })
    },
    onPasswordReset: ({ user }) => sendInBackground(AUTH_EMAILS.sendPasswordChanged({ callbackURL: pageCallbackURL(), user })),
    requireEmailVerification: true,
    resetPasswordTokenExpiresIn: EMAIL_LINK_LIFETIME_SECONDS,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: AUTH_EMAILS.sendResetPassword,
  },
  emailVerification: {
    autoSignInAfterVerification: true,
    expiresIn: EMAIL_LINK_LIFETIME_SECONDS,
    sendOnSignIn: true,
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
