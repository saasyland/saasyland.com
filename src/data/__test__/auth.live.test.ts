import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import * as zod from "zod"

import { AUTH_PROVIDER } from "~/src/integrations/better-auth/auth.constants"

import { DEPLOYED_HOSTS, ENVIRONMENT, HTTP_STATUS } from "~/src/modules/_core/constants/api"

import { OAUTH_PROVIDERS, SOCIAL_SIGN_IN_PATH } from "~/src/data/auth"
import { LIVE_SITE_CHECKS } from "~/src/data/live"
import { CONTENT_TYPE } from "~/src/data/live.constants"

import { LIVE_SITE_CHECK_RETRY_DELAYS_MS, verifyDeployment } from "~/src/lib/deployment"

import * as ROUTES from "~/src/routes"

type Provider = (typeof OAUTH_PROVIDERS)[number]["id"]

type SignIn = () => Response

type Parameters = Readonly<Record<string, string>>

const ORIGIN = `https://${DEPLOYED_HOSTS[ENVIRONMENT.PRODUCTION]}`

const PREVIEW_ORIGIN = `https://${DEPLOYED_HOSTS[ENVIRONMENT.PREVIEW]}`

const EVERY_RETRY_MS = LIVE_SITE_CHECK_RETRY_DELAYS_MS.reduce((total, delay) => total + delay, 0)

const SIGN_IN_REQUEST = `POST ${ORIGIN}${SOCIAL_SIGN_IN_PATH}`

const PLACEHOLDER = "[UPDATE]"

const callbackUrl = (provider: Provider, origin = ORIGIN): string =>
  `${origin}${ROUTES.API_AUTH_BASE}${ROUTES.API_AUTH.CALLBACK}/${provider}`

const AUTHORIZE_ENDPOINT = {
  [AUTH_PROVIDER.GITHUB]: "https://github.com/login/oauth/authorize",
  [AUTH_PROVIDER.GOOGLE]: "https://accounts.google.com/o/oauth2/v2/auth",
} as const satisfies Record<Provider, string>

const CLIENT_ID = {
  [AUTH_PROVIDER.GITHUB]: "Ov23liAbCdEfGhIjKlMn",
  [AUTH_PROVIDER.GOOGLE]: "123456789012-abcdefghijklmnopqrstuvwxyz012345.apps.googleusercontent.com",
} as const satisfies Record<Provider, string>

const CALLBACK = {
  [AUTH_PROVIDER.GITHUB]: callbackUrl(AUTH_PROVIDER.GITHUB),
  [AUTH_PROVIDER.GOOGLE]: callbackUrl(AUTH_PROVIDER.GOOGLE),
} as const satisfies Record<Provider, string>

const signInRequestSchema = zod.object({ provider: zod.literal(OAUTH_PROVIDERS.map(({ id }) => id)) })

const answer =
  (body: unknown, status: number = HTTP_STATUS.OK): SignIn =>
  () =>
    Response.json(body, { status })

const signInAt = (endpoint: string, parameters: Parameters): SignIn => {
  const url = new URL(endpoint)
  url.search = new URLSearchParams({ response_type: "code", state: "state", ...parameters }).toString()

  return answer({ redirect: true, url: url.href })
}

const providerSignIn = (provider: Provider, parameters: Parameters = {}): SignIn =>
  signInAt(AUTHORIZE_ENDPOINT[provider], { client_id: CLIENT_ID[provider], redirect_uri: CALLBACK[provider], ...parameters })

const WORKING_SIGN_INS: Readonly<Record<Provider, SignIn>> = {
  [AUTH_PROVIDER.GITHUB]: providerSignIn(AUTH_PROVIDER.GITHUB),
  [AUTH_PROVIDER.GOOGLE]: providerSignIn(AUTH_PROVIDER.GOOGLE),
}

const PAGES: Readonly<Record<string, () => Response>> = Object.fromEntries(
  LIVE_SITE_CHECKS.map(({ contentType, path, status }) => [
    path,
    () => new Response("body", { headers: { "content-type": contentType }, status }),
  ]),
)

const fetchMock = vi.fn<(input: URL, init: RequestInit) => Promise<Response>>()

const serve = (signIns: Partial<Record<Provider, SignIn>> = {}): void => {
  const answers = { ...WORKING_SIGN_INS, ...signIns }
  fetchMock.mockImplementation(async (url, init) => {
    if (url.pathname === SOCIAL_SIGN_IN_PATH) {
      const { provider } = signInRequestSchema.parse(await new Request(url, init).json())

      return answers[provider]()
    }

    const page = PAGES[url.pathname]
    if (page === undefined) {
      throw new Error(`unexpected request to ${url.href}`)
    }

    return page()
  })
}

const signInRequests = (): Request[] =>
  fetchMock.mock.calls.filter(([url]) => url.pathname === SOCIAL_SIGN_IN_PATH).map(([url, init]) => new Request(url, init))

const expectRefusal = async (...problems: readonly string[]): Promise<void> => {
  const failure = expect(verifyDeployment(ENVIRONMENT.PRODUCTION)).rejects.toThrow(
    new Error([`The production Worker at ${ORIGIN} is deployed but does not answer as expected:`, ...problems].join("\n")),
  )
  await vi.advanceTimersByTimeAsync(EVERY_RETRY_MS)

  await failure
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe("the live sign-in check on a site whose providers are configured", () => {
  it("starts the sign-in with every provider of the sign-in page as the browser does, from the site's own origin", async () => {
    serve()

    const report = await verifyDeployment(ENVIRONMENT.PRODUCTION)

    for (const { name } of OAUTH_PROVIDERS) {
      expect(report).toContain(`${SOCIAL_SIGN_IN_PATH} (${name} sign-in)`)
    }
    const requests = signInRequests()
    const bodies: unknown[] = await Promise.all(requests.map((request) => request.json()))
    expect(bodies).toStrictEqual(
      OAUTH_PROVIDERS.map(({ id }) => ({ callbackURL: ROUTES.AUTH_CALLBACK, errorCallbackURL: ROUTES.SIGN_IN, provider: id })),
    )
    expect(
      requests.map(({ headers, method }) => ({ contentType: headers.get("content-type"), method, origin: headers.get("origin") })),
    ).toStrictEqual(OAUTH_PROVIDERS.map(() => ({ contentType: CONTENT_TYPE.JSON, method: "POST", origin: ORIGIN })))
  })

  it.each([
    ["an OAuth app's current client ID", CLIENT_ID[AUTH_PROVIDER.GITHUB]],
    ["an OAuth app's older client ID of 20 hex digits", "0123456789abcdef0123"],
    ["a GitHub App's current client ID", "Iv23liAbCdEfGhIjKlMn"],
    ["a GitHub App's older client ID", "Iv1.0123456789abcdef"],
  ])("accepts %s for GitHub", async (_kind, clientId) => {
    serve({ [AUTH_PROVIDER.GITHUB]: providerSignIn(AUTH_PROVIDER.GITHUB, { client_id: clientId }) })

    await expect(verifyDeployment(ENVIRONMENT.PRODUCTION)).resolves.toContain("as expected")
  })
})

describe("the live sign-in check on a site whose providers are misconfigured", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it("refuses a placeholder client_id, naming the provider without printing the value", async () => {
    serve({ [AUTH_PROVIDER.GOOGLE]: providerSignIn(AUTH_PROVIDER.GOOGLE, { client_id: PLACEHOLDER }) })

    await expectRefusal(`${SIGN_IN_REQUEST} (Google sign-in): client_id is not a Google OAuth client ID.`)
  })

  it.each([
    [AUTH_PROVIDER.GITHUB, "GitHub", CLIENT_ID[AUTH_PROVIDER.GOOGLE]],
    [AUTH_PROVIDER.GITHUB, "GitHub", `${CLIENT_ID[AUTH_PROVIDER.GITHUB]}0`],
    [AUTH_PROVIDER.GOOGLE, "Google", CLIENT_ID[AUTH_PROVIDER.GITHUB]],
    [AUTH_PROVIDER.GOOGLE, "Google", ""],
  ] as const)("refuses a %s sign-in whose client_id belongs to no %s OAuth client", async (provider, name, clientId) => {
    serve({ [provider]: providerSignIn(provider, { client_id: clientId }) })

    await expectRefusal(`${SIGN_IN_REQUEST} (${name} sign-in): client_id is not a ${name} OAuth client ID.`)
  })

  it("refuses an authorize URL without a client_id", async () => {
    serve({ [AUTH_PROVIDER.GITHUB]: signInAt(AUTHORIZE_ENDPOINT[AUTH_PROVIDER.GITHUB], { redirect_uri: CALLBACK[AUTH_PROVIDER.GITHUB] }) })

    await expectRefusal(`${SIGN_IN_REQUEST} (GitHub sign-in): client_id is not a GitHub OAuth client ID.`)
  })

  it.each([
    ["another host", "https://github.example.com/login/oauth/authorize"],
    ["the provider's host without TLS", "http://github.com/login/oauth/authorize"],
  ])("refuses an authorize URL on %s", async (_target, endpoint) => {
    serve({
      [AUTH_PROVIDER.GITHUB]: signInAt(endpoint, {
        client_id: CLIENT_ID[AUTH_PROVIDER.GITHUB],
        redirect_uri: CALLBACK[AUTH_PROVIDER.GITHUB],
      }),
    })

    await expectRefusal(`${SIGN_IN_REQUEST} (GitHub sign-in): the authorize URL is not on https://github.com.`)
  })

  it.each([
    ["another deployment's callback", callbackUrl(AUTH_PROVIDER.GOOGLE, PREVIEW_ORIGIN)],
    ["another provider's callback", CALLBACK[AUTH_PROVIDER.GITHUB]],
  ])("refuses a redirect_uri that returns to %s", async (_target, redirectUri) => {
    serve({ [AUTH_PROVIDER.GOOGLE]: providerSignIn(AUTH_PROVIDER.GOOGLE, { redirect_uri: redirectUri }) })

    await expectRefusal(`${SIGN_IN_REQUEST} (Google sign-in): redirect_uri is not ${CALLBACK[AUTH_PROVIDER.GOOGLE]}.`)
  })

  it("lists every problem of a sign-in, and of each provider that has one", async () => {
    serve({
      [AUTH_PROVIDER.GITHUB]: signInAt(AUTHORIZE_ENDPOINT[AUTH_PROVIDER.GOOGLE], {
        client_id: PLACEHOLDER,
        redirect_uri: CALLBACK[AUTH_PROVIDER.GOOGLE],
      }),
      [AUTH_PROVIDER.GOOGLE]: providerSignIn(AUTH_PROVIDER.GOOGLE, { client_id: PLACEHOLDER }),
    })

    await expectRefusal(
      [
        `${SIGN_IN_REQUEST} (GitHub sign-in): the authorize URL is not on https://github.com`,
        "client_id is not a GitHub OAuth client ID",
        `redirect_uri is not ${CALLBACK[AUTH_PROVIDER.GITHUB]}.`,
      ].join(", "),
      `${SIGN_IN_REQUEST} (Google sign-in): client_id is not a Google OAuth client ID.`,
    )
  })

  it("refuses a sign-in endpoint that fails, naming the provider and asking it again before giving up", async () => {
    serve({ [AUTH_PROVIDER.GOOGLE]: answer({}, HTTP_STATUS.NOT_FOUND) })

    await expectRefusal(
      `${SIGN_IN_REQUEST} (Google sign-in) answered ${String(HTTP_STATUS.NOT_FOUND)} ${CONTENT_TYPE.JSON} instead of ${String(HTTP_STATUS.OK)} ${CONTENT_TYPE.JSON}.`,
    )
    expect(signInRequests()).toHaveLength(OAUTH_PROVIDERS.length + LIVE_SITE_CHECK_RETRY_DELAYS_MS.length)
  })

  it("refuses a sign-in that answers without an authorize URL", async () => {
    serve({ [AUTH_PROVIDER.GITHUB]: answer({ redirect: false }) })

    await expectRefusal(`${SIGN_IN_REQUEST} (GitHub sign-in): the answer carries no authorize URL.`)
  })
})
