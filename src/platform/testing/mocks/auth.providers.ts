import { env } from "cloudflare:workers"

import type { ProviderDouble } from "~/src/platform/testing/mocks/providers"

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"

import { MILLISECONDS_PER_SECOND } from "~/src/lib/duration"

import { BREACHED_PASSWORD } from "~/e2e/data/accounts"
import { githubTestIdentity } from "~/e2e/data/github"
import { GOOGLE_CALLBACK_PATH, type GoogleGrant, googleTestGrant } from "~/e2e/data/google"
import { APP_GITHUB_OWNER, APP_GITHUB_REPO } from "~/src/presentation/branding"

const RANGE_PATH = /^\/range\/(?<prefix>[\dA-F]{5})$/u
const HASH_PREFIX_LENGTH = 5
const BREACH_COUNT = 9_545_824
const PADDING_LINE = `${"0".repeat(35)}:0`
const LINE_BREAK = "\r\n"

const sha1 = async (value: string): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(value))
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()
}

export const haveIBeenPwnedApi = {
  origin: "https://api.pwnedpasswords.com",
  reset: () => {},
  respond: async (request: Request) => {
    const prefix = RANGE_PATH.exec(new URL(request.url).pathname)?.groups?.["prefix"]
    if (request.method !== "GET" || prefix === undefined) {
      return {
        reason: `The test double does not serve ${request.method} ${request.url}`,
        response: new Response(null, { status: HTTP_STATUS.NOT_FOUND }),
      }
    }
    const breached = await sha1(BREACHED_PASSWORD)
    const lines = breached.startsWith(prefix) ? [`${breached.slice(HASH_PREFIX_LENGTH)}:${String(BREACH_COUNT)}`] : []
    return new Response([...lines, PADDING_LINE].join(LINE_BREAK))
  },
} satisfies ProviderDouble

const GITHUB_TOKEN_PATH = "/login/oauth/access_token"
const GITHUB_SCOPES = "read:user,user:email"
const BEARER_PREFIX = "Bearer "
const REPOSITORY_PATH = `/repos/${APP_GITHUB_OWNER}/${APP_GITHUB_REPO}`

const GITHUB_TEST_STAR_COUNT = 42

const refuse = (request: Request, status: number) => ({
  reason: `The test double does not serve ${request.method} ${request.url}`,
  response: new Response(null, { status }),
})

export const githubLogin = {
  origin: "https://github.com",
  reset: () => {},
  respond: async (request: Request) => {
    if (request.method !== "POST" || new URL(request.url).pathname !== GITHUB_TOKEN_PATH) {
      return refuse(request, HTTP_STATUS.NOT_FOUND)
    }
    const body = new URLSearchParams(await request.text())
    const code = body.get("code") ?? ""
    if (
      body.get("client_id") !== env.AUTH_GITHUB_CLIENT_ID ||
      body.get("redirect_uri") === null ||
      githubTestIdentity(code) === undefined
    ) {
      return Response.json({ error: "bad_verification_code" })
    }
    return Response.json({ access_token: code, scope: GITHUB_SCOPES, token_type: "bearer" })
  },
} satisfies ProviderDouble

export const githubApi = {
  origin: "https://api.github.com",
  reset: () => {},
  respond: async (request: Request) => {
    if (request.method === "GET" && new URL(request.url).pathname === REPOSITORY_PATH) {
      return Response.json({ stargazers_count: GITHUB_TEST_STAR_COUNT })
    }
    const identity = githubTestIdentity(request.headers.get("authorization")?.replace(BEARER_PREFIX, "") ?? "")
    if (request.method !== "GET" || identity === undefined) {
      return refuse(request, HTTP_STATUS.UNAUTHORIZED)
    }
    const { pathname } = new URL(request.url)
    if (pathname === "/user") {
      return Response.json({
        avatar_url: null,
        email: identity.email,
        id: identity.id,
        login: `user${String(identity.id)}`,
        name: identity.name,
      })
    }
    if (pathname === "/user/emails") {
      return Response.json([{ email: identity.email, primary: true, verified: true, visibility: "public" }])
    }
    return refuse(request, HTTP_STATUS.NOT_FOUND)
  },
} satisfies ProviderDouble

const GOOGLE_TOKEN_PATH = "/token"
const GOOGLE_ISSUER = "https://accounts.google.com"
const GOOGLE_GRANT_TYPE = "authorization_code"
const GOOGLE_TOKEN_SCOPES = "openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile"
const GOOGLE_TOKEN_LIFETIME_SECONDS = 3599
const UNSECURED_JWT_HEADER = { alg: "none", typ: "JWT" }

const base64Url = (bytes: Uint8Array): string =>
  btoa(String.fromCodePoint(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "")

const encodeSegment = (value: object): string => base64Url(new TextEncoder().encode(JSON.stringify(value)))

const codeChallengeOf = async (verifier: string): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))
  return base64Url(new Uint8Array(digest))
}

const googleIdToken = ({ email, name, sub }: GoogleGrant): string => {
  const issuedAt = Math.floor(Date.now() / MILLISECONDS_PER_SECOND)
  const claims = {
    aud: env.AUTH_GOOGLE_CLIENT_ID,
    azp: env.AUTH_GOOGLE_CLIENT_ID,
    email,
    email_verified: true,
    exp: issuedAt + GOOGLE_TOKEN_LIFETIME_SECONDS,
    iat: issuedAt,
    iss: GOOGLE_ISSUER,
    name,
    sub,
  }
  return `${encodeSegment(UNSECURED_JWT_HEADER)}.${encodeSegment(claims)}.`
}

const isGoogleClient = (body: URLSearchParams): boolean =>
  body.get("client_id") === env.AUTH_GOOGLE_CLIENT_ID && body.get("client_secret") === env.AUTH_GOOGLE_CLIENT_SECRET

const answersGrant = async (body: URLSearchParams, grant: GoogleGrant): Promise<boolean> =>
  body.get("grant_type") === GOOGLE_GRANT_TYPE &&
  URL.parse(body.get("redirect_uri") ?? "")?.pathname === GOOGLE_CALLBACK_PATH &&
  (await codeChallengeOf(body.get("code_verifier") ?? "")) === grant.codeChallenge

export const googleOAuth = {
  origin: "https://oauth2.googleapis.com",
  reset: () => {},
  respond: async (request: Request) => {
    if (request.method !== "POST" || new URL(request.url).pathname !== GOOGLE_TOKEN_PATH) {
      return refuse(request, HTTP_STATUS.NOT_FOUND)
    }
    const body = new URLSearchParams(await request.text())
    if (!isGoogleClient(body)) {
      return {
        reason: "The client is not the app's Google client",
        response: Response.json({ error: "invalid_client" }, { status: HTTP_STATUS.UNAUTHORIZED }),
      }
    }
    const grant = googleTestGrant(body.get("code") ?? "")
    if (grant === undefined || !(await answersGrant(body, grant))) {
      return {
        reason: "The code, its PKCE verifier or the redirect_uri does not match the authorization",
        response: Response.json({ error: "invalid_grant" }, { status: HTTP_STATUS.BAD_REQUEST }),
      }
    }
    return Response.json({
      access_token: crypto.randomUUID(),
      expires_in: GOOGLE_TOKEN_LIFETIME_SECONDS,
      id_token: googleIdToken(grant),
      scope: GOOGLE_TOKEN_SCOPES,
      token_type: "Bearer",
    })
  },
} satisfies ProviderDouble

export const AUTH_PROVIDER_DOUBLES = [githubApi, githubLogin, googleOAuth, haveIBeenPwnedApi] as const satisfies readonly ProviderDouble[]
