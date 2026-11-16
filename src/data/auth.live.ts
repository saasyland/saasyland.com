import * as zod from "zod"

import { AUTH_PROVIDER } from "~/src/integrations/better-auth/auth.constants"

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"

import { OAUTH_PROVIDERS, SOCIAL_SIGN_IN_PATH, oauthCallbackPath } from "~/src/data/auth"
import { CONTENT_TYPE, type LiveSiteCheck } from "~/src/data/live.constants"

import { ROUTES } from "~/src/routes"

type OAuthProvider = (typeof OAUTH_PROVIDERS)[number]

interface OAuthClientFormat {
  readonly authorizeOrigin: string
  readonly clientId: RegExp
}

const AUTHORIZE_PARAM = {
  CLIENT_ID: "client_id",
  REDIRECT_URI: "redirect_uri",
} as const

const OAUTH_CLIENT_FORMATS = {
  [AUTH_PROVIDER.GITHUB]: {
    authorizeOrigin: "https://github.com",
    clientId: /^(?:[\da-f]{20}|Iv1\.[\da-f]{16}|[IO]v23[\dA-Za-z]{16})$/u,
  },
  [AUTH_PROVIDER.GOOGLE]: {
    authorizeOrigin: "https://accounts.google.com",
    clientId: /^\d+-[\da-z]+\.apps\.googleusercontent\.com$/u,
  },
} as const satisfies Record<OAuthProvider["id"], OAuthClientFormat>

const signInAnswerSchema = zod.object({ url: zod.url() })

const findSignInProblems =
  ({ id, name }: OAuthProvider) =>
  (answer: unknown, origin: string): readonly string[] => {
    const signIn = signInAnswerSchema.safeParse(answer)
    if (!signIn.success) {
      return ["the answer carries no authorize URL"]
    }

    const { authorizeOrigin, clientId } = OAUTH_CLIENT_FORMATS[id]
    const authorize = new URL(signIn.data.url)
    const redirectUri = `${origin}${oauthCallbackPath(id)}`

    return [
      { found: authorize.origin !== authorizeOrigin, problem: `the authorize URL is not on ${authorizeOrigin}` },
      {
        found: !clientId.test(authorize.searchParams.get(AUTHORIZE_PARAM.CLIENT_ID) ?? ""),
        problem: `${AUTHORIZE_PARAM.CLIENT_ID} is not a ${name} OAuth client ID`,
      },
      {
        found: authorize.searchParams.get(AUTHORIZE_PARAM.REDIRECT_URI) !== redirectUri,
        problem: `${AUTHORIZE_PARAM.REDIRECT_URI} is not ${redirectUri}`,
      },
    ]
      .filter(({ found }) => found)
      .map(({ problem }) => problem)
  }

export const AUTH_LIVE_CHECKS = [
  { contentType: CONTENT_TYPE.JSON, path: `${ROUTES.API_AUTH_BASE}${ROUTES.API_AUTH.GET_SESSION}`, status: HTTP_STATUS.OK },
  ...OAUTH_PROVIDERS.map((provider) => ({
    contentType: CONTENT_TYPE.JSON,
    path: SOCIAL_SIGN_IN_PATH,
    post: {
      body: { callbackURL: ROUTES.AUTH_CALLBACK, errorCallbackURL: ROUTES.SIGN_IN, provider: provider.id },
      findProblems: findSignInProblems(provider),
      name: `${provider.name} sign-in`,
    },
    status: HTTP_STATUS.OK,
  })),
] as const satisfies readonly LiveSiteCheck[]
