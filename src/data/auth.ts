import { AUTH_PROVIDER } from "~/src/integrations/better-auth/auth.constants"

import { ROUTES } from "~/src/routes"

interface OAuthClient {
  readonly authorizeOrigin: string
  readonly clientIdFormat: RegExp
  readonly clientIdVariable: keyof Cloudflare.Env
}

export const AUTH_ASSURANCES = ["coverage", "pricing", "ownership"] as const

export const OAUTH_PROVIDERS = [
  { id: AUTH_PROVIDER.GOOGLE, name: "Google" },
  { id: AUTH_PROVIDER.GITHUB, name: "GitHub" },
] as const

export const OAUTH_CLIENTS = {
  [AUTH_PROVIDER.GITHUB]: {
    authorizeOrigin: "https://github.com",
    clientIdFormat: /^(?:[\da-f]{20}|Iv1\.[\da-f]{16}|[IO]v23[\dA-Za-z]{16})$/u,
    clientIdVariable: "AUTH_GITHUB_CLIENT_ID",
  },
  [AUTH_PROVIDER.GOOGLE]: {
    authorizeOrigin: "https://accounts.google.com",
    clientIdFormat: /^\d+-[\da-z]+\.apps\.googleusercontent\.com$/u,
    clientIdVariable: "AUTH_GOOGLE_CLIENT_ID",
  },
} as const satisfies Record<(typeof OAUTH_PROVIDERS)[number]["id"], OAuthClient>

export const SOCIAL_SIGN_IN_PATH = `${ROUTES.API_AUTH_BASE}${ROUTES.API_AUTH.SIGN_IN_SOCIAL}`

export const oauthCallbackPath = (provider: string): string => `${ROUTES.API_AUTH_BASE}${ROUTES.API_AUTH.CALLBACK}/${provider}`
