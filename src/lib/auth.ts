import * as zod from "zod"

import { OAUTH_CLIENTS, OAUTH_PROVIDERS, oauthCallbackPath } from "~/src/data/auth"

import type { LiveSitePost } from "~/src/lib/deployment"

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

export const signInPost = (provider: OAuthProvider): LiveSitePost => ({
  body: { callbackURL: ROUTES.AUTH_CALLBACK, errorCallbackURL: ROUTES.SIGN_IN, provider: provider.id },
  findProblems: findSignInProblems(provider),
  name: `${provider.name} sign-in`,
})

export const verifyAuth = ({
  file,
  values,
}: {
  readonly file: string
  readonly values: Readonly<Record<string, string | undefined>>
}): string => {
  const clients = OAUTH_PROVIDERS.map(({ id, name }) => {
    const { clientIdFormat, clientIdVariable } = OAUTH_CLIENTS[id]

    return { name, valid: clientIdFormat.test(values[clientIdVariable] ?? ""), variable: clientIdVariable }
  })
  const invalid = clients.filter(({ valid }) => !valid)

  if (invalid.length > 0) {
    throw new Error(invalid.map(({ name, variable }) => `${variable} in ${file} is not a ${name} OAuth client ID.`).join("\n"))
  }

  return clients.map(({ name, variable }) => `${variable} in ${file} is a ${name} OAuth client ID.`).join("\n")
}
