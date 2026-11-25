import * as zod from "zod"

import { AUTH_PROVIDER } from "../../src/integrations/better-auth/auth.constants"
import * as ROUTES from "../../src/routes"

export const GOOGLE_AUTHORIZE_PATH = "/o/oauth2/v2/auth"

export const GOOGLE_AUTHORIZE_TEST_PATH = "/__test/google/authorize"

export const GOOGLE_CALLBACK_PATH = `${ROUTES.API_AUTH_BASE}/callback/${AUTH_PROVIDER.GOOGLE}`

export const GOOGLE_IDENTITY_PARAM = "identity"

export const GOOGLE_SCOPES = ["openid", "email", "profile"] as const

export const GOOGLE_PKCE_METHOD = "S256"

const googleIdentitySchema = zod.object({
  email: zod.email(),
  name: zod.string().min(1),
  sub: zod.string().min(1),
})

const googleGrantSchema = googleIdentitySchema.extend({ codeChallenge: zod.string().min(1) })

export type GoogleIdentity = zod.output<typeof googleIdentitySchema>

export type GoogleGrant = zod.output<typeof googleGrantSchema>

const encode = (fields: Record<string, string>): string => new URLSearchParams(fields).toString()

const decode = (encoded: string): Record<string, string> => Object.fromEntries(new URLSearchParams(encoded))

export const googleTestIdentityParam = (identity: GoogleIdentity): string => encode(identity)

export const googleTestIdentity = (encoded: string): GoogleIdentity | undefined => googleIdentitySchema.safeParse(decode(encoded)).data

export const googleTestCode = (grant: GoogleGrant): string => encode(grant)

export const googleTestGrant = (code: string): GoogleGrant | undefined => googleGrantSchema.safeParse(decode(code)).data
