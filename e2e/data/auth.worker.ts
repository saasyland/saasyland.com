import * as zod from "zod"

import { AUTH_PROVIDER } from "../../src/integrations/better-auth/auth.constants"
import { HTTP_STATUS } from "../../src/modules/_core/constants/api"
import { githubTestIdentity } from "./github"
import {
  GOOGLE_AUTHORIZE_TEST_PATH,
  GOOGLE_CALLBACK_PATH,
  GOOGLE_IDENTITY_PARAM,
  GOOGLE_PKCE_METHOD,
  GOOGLE_SCOPES,
  googleTestCode,
  googleTestIdentity,
} from "./google"
import { ROUTES } from "../../src/routes"
import { TEST_WORKER_KIND, type TestWorkerEntry } from "./worker"

export const GITHUB_AUTHORIZE_TEST_PATH = "/__test/github/authorize"

const GITHUB_CALLBACK_PATH = `${ROUTES.API.AUTH.BASE}/callback/${AUTH_PROVIDER.GITHUB}`

const AUTHORIZATION_CODE_RESPONSE = "code"

const SCOPE_SEPARATOR = " "

const TEST_EMAIL_DOMAIN = "@example.test"

const refuseAuthorization = (error: string): Response => Response.json({ error }, { status: HTTP_STATUS.BAD_REQUEST })

const testEmailSchema = zod.email().endsWith(TEST_EMAIL_DOMAIN)

const isAppCallback = (url: URL, redirectUri: ReturnType<typeof URL.parse>, path: string): redirectUri is URL =>
  redirectUri?.origin === url.origin && redirectUri.pathname === path

const testEmail = (url: URL): string | undefined => testEmailSchema.safeParse(url.searchParams.get("email")).data

const requireTestEmail = (): Response => Response.json({ error: "A test email address is required" }, { status: HTTP_STATUS.BAD_REQUEST })

export const AUTH_TEST_WORKER = [
  {
    kind: TEST_WORKER_KIND.ENDPOINT,
    path: GITHUB_AUTHORIZE_TEST_PATH,
    respond: (url, env) => {
      const redirectUri = URL.parse(url.searchParams.get("redirect_uri") ?? "")
      const state = url.searchParams.get("state") ?? ""
      const code = url.searchParams.get("code") ?? ""
      if (url.searchParams.get("client_id") !== env.AUTH_GITHUB_CLIENT_ID) {
        return Promise.resolve(refuseAuthorization("The client_id is not the app's GitHub client"))
      }
      if (!isAppCallback(url, redirectUri, GITHUB_CALLBACK_PATH)) {
        return Promise.resolve(refuseAuthorization("The redirect_uri is not the app's GitHub callback"))
      }
      if (state.length === 0 || githubTestIdentity(code) === undefined) {
        return Promise.resolve(refuseAuthorization("A state and a test identity code are required"))
      }
      redirectUri.searchParams.set("code", code)
      redirectUri.searchParams.set("state", state)
      return Promise.resolve(Response.redirect(redirectUri.toString(), HTTP_STATUS.FOUND))
    },
  },
  {
    kind: TEST_WORKER_KIND.ENDPOINT,
    path: GOOGLE_AUTHORIZE_TEST_PATH,
    respond: (url, env) => {
      const { searchParams } = url
      const redirectUri = URL.parse(searchParams.get("redirect_uri") ?? "")
      const scopes = (searchParams.get("scope") ?? "").split(SCOPE_SEPARATOR)
      const state = searchParams.get("state") ?? ""
      const codeChallenge = searchParams.get("code_challenge") ?? ""
      const identity = googleTestIdentity(searchParams.get(GOOGLE_IDENTITY_PARAM) ?? "")
      if (searchParams.get("client_id") !== env.AUTH_GOOGLE_CLIENT_ID) {
        return Promise.resolve(refuseAuthorization("The client_id is not the app's Google client"))
      }
      if (!isAppCallback(url, redirectUri, GOOGLE_CALLBACK_PATH)) {
        return Promise.resolve(refuseAuthorization("The redirect_uri is not the app's Google callback"))
      }
      if (
        searchParams.get("response_type") !== AUTHORIZATION_CODE_RESPONSE ||
        searchParams.get("code_challenge_method") !== GOOGLE_PKCE_METHOD ||
        !GOOGLE_SCOPES.every((scope) => scopes.includes(scope))
      ) {
        return Promise.resolve(refuseAuthorization("Google answers only an authorization code request with PKCE for the openid, email and profile scopes"))
      }
      if (state.length === 0 || codeChallenge.length === 0 || identity === undefined) {
        return Promise.resolve(refuseAuthorization("A state, a code challenge and a test identity are required"))
      }
      redirectUri.searchParams.set("code", googleTestCode({ ...identity, codeChallenge }))
      redirectUri.searchParams.set("state", state)
      return Promise.resolve(Response.redirect(redirectUri.toString(), HTTP_STATUS.FOUND))
    },
  },
  {
    kind: TEST_WORKER_KIND.ENDPOINT,
    path: "/__test/invitations/expire",
    respond: async (url, env) => {
      const email = testEmail(url)
      if (email === undefined) {
        return requireTestEmail()
      }
      const { meta } = await env.DB.prepare("UPDATE invitation SET expires_at = ? WHERE email = ? AND accepted_at IS NULL AND revoked_at IS NULL")
        .bind(Date.now() - 1, email)
        .run()
      return Response.json({ expired: meta.changes })
    },
  },
  {
    kind: TEST_WORKER_KIND.ENDPOINT,
    path: "/__test/password-resets/expire",
    respond: async (url, env) => {
      const email = testEmail(url)
      if (email === undefined) {
        return requireTestEmail()
      }
      const { meta } = await env.DB.prepare('UPDATE verification SET expires_at = ? WHERE value = (SELECT id FROM "user" WHERE email = ?)')
        .bind(Date.now() - 1, email)
        .run()
      return Response.json({ expired: meta.changes })
    },
  },
] as const satisfies readonly TestWorkerEntry[]
