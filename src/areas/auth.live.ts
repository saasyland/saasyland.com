import * as zod from "zod"

import { OAUTH_CLIENTS, OAUTH_PROVIDERS, SOCIAL_SIGN_IN_PATH, oauthCallbackPath } from "~/src/data/auth"
import { CONTENT_TYPE, type LiveSiteCheck } from "~/src/data/live.constants"

import * as ROUTES from "~/src/routes"

type OAuthProvider = (typeof OAUTH_PROVIDERS)[number]

const AUTHORIZE_PARAM = {
  CLIENT_ID: "client_id",
  REDIRECT_URI: "redirect_uri",
} as const

const signInAnswerSchema = zod.object({ url: zod.url() })

const findSignInProblems =
  ({ id, name }: OAuthProvider) =>
  (answer: unknown, origin: string): readonly string[] => {
    const signIn = signInAnswerSchema.safeParse(answer)
    if (!signIn.success) {
      return ["the answer carries no authorize URL"]
    }

    const { authorizeOrigin, clientIdFormat } = OAUTH_CLIENTS[id]
    const authorize = new URL(signIn.data.url)
    const redirectUri = `${origin}${oauthCallbackPath(id)}`

    return [
      { found: authorize.origin !== authorizeOrigin, problem: `the authorize URL is not on ${authorizeOrigin}` },
      {
        found: !clientIdFormat.test(authorize.searchParams.get(AUTHORIZE_PARAM.CLIENT_ID) ?? ""),
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
  { contentType: CONTENT_TYPE.JSON, path: `${ROUTES.API_AUTH_BASE}${ROUTES.API_AUTH.GET_SESSION}` },
  ...OAUTH_PROVIDERS.map((provider) => ({
    contentType: CONTENT_TYPE.JSON,
    path: SOCIAL_SIGN_IN_PATH,
    post: {
      body: { callbackURL: ROUTES.AUTH_CALLBACK, errorCallbackURL: ROUTES.SIGN_IN, provider: provider.id },
      findProblems: findSignInProblems(provider),
      name: `${provider.name} sign-in`,
    },
  })),
] as const satisfies readonly LiveSiteCheck[]
