import { env } from "cloudflare:workers"

import type { ProviderDouble } from "~/src/platform/testing/mocks/providers"

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"

import { BREACHED_PASSWORD } from "~/e2e/data/accounts"
import { githubTestIdentity } from "~/e2e/data/github"
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

export const AUTH_PROVIDER_DOUBLES = [githubApi, githubLogin, haveIBeenPwnedApi] as const satisfies readonly ProviderDouble[]
