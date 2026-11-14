import { describe, expect, it } from "vite-plus/test"

import { TEST_APP_URL } from "~/src/platform/testing/lib/test-request"

import {
  browserHeaders,
  browserRequest,
  createTestAccount,
  nextClientAddress,
  postJson,
  sessionCookie,
} from "~/src/integrations/better-auth/__test__/fixtures/auth.harness"
import { AUTH_PROVIDER } from "~/src/integrations/better-auth/auth.constants"
import { authErrorKey, authErrorKeyFromSearch } from "~/src/integrations/better-auth/auth.errors"
import { auth } from "~/src/integrations/better-auth/auth.server"

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"

import { searchText } from "~/src/lib/search-params"

import { ROUTES } from "~/src/routes"

const SIGN_IN_ATTEMPTS_PER_WINDOW = 3
const PROVIDER_CALLBACK = `${ROUTES.API_AUTH_BASE}${ROUTES.API_AUTH.CALLBACK}/${AUTH_PROVIDER.GITHUB}`

const readClientError = async (response: Response): Promise<Record<string, unknown>> => ({
  ...(await response.json<Record<string, unknown>>()),
  status: response.status,
  statusText: response.statusText,
})

const signInWithUnknownAccount = (ip: string): Promise<Response> =>
  auth.handler(
    postJson(
      `${ROUTES.API_AUTH_BASE}${ROUTES.API_AUTH.SIGN_IN_EMAIL}`,
      { email: createTestAccount().email, password: "WrongPass1!" },
      { ip },
    ),
  )

const redirectError = (response: Response): { error: string | undefined; pathname: string } => {
  const location = new URL(response.headers.get("location") ?? "", TEST_APP_URL)
  return { error: searchText().parse(location.searchParams.get("error")), pathname: location.pathname }
}

describe("Better Auth responses mapped to user-facing errors", () => {
  it("keeps sign-in failures generic and turns the rate limiter's code-less 429 into the retry message", async () => {
    const ip = nextClientAddress()
    const responses = []
    for (let attempt = 0; attempt <= SIGN_IN_ATTEMPTS_PER_WINDOW; attempt++) {
      responses.push(await signInWithUnknownAccount(ip))
    }
    const [rejected] = responses
    const limited = responses.at(-1)

    expect(rejected?.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    expect(authErrorKey(await readClientError(rejected!))).toBe("invalidEmailOrPassword")
    expect(limited?.status).toBe(HTTP_STATUS.TOO_MANY_REQUESTS)
    const limitedError = await readClientError(limited!)
    expect(limitedError).not.toHaveProperty("code")
    expect(authErrorKey(limitedError)).toBe("tooManyRequests")
  })

  it("sends a provider cancellation back to the per-flow error page with a mappable code", async () => {
    const started = await auth.api.signInSocial({
      body: { callbackURL: ROUTES.AUTH_CALLBACK, errorCallbackURL: ROUTES.SIGN_IN, provider: AUTH_PROVIDER.GITHUB },
      headers: browserHeaders(),
      returnHeaders: true,
    })
    const state = new URL(started.response.url ?? "").searchParams.get("state")
    const query = new URLSearchParams({ error: "access_denied", error_description: "Call +1 555 0100 to unlock", state: state ?? "" })

    const headers = browserHeaders({ cookie: sessionCookie(started.headers) })

    const response = await auth.handler(browserRequest(`${PROVIDER_CALLBACK}?${query}`, { headers }))

    expect(response.status).toBe(HTTP_STATUS.FOUND)
    const { error, pathname } = redirectError(response)
    expect(pathname).toBe(ROUTES.SIGN_IN)
    expect(authErrorKeyFromSearch(error)).toBe("signInCancelled")
  })

  it("maps a callback that lost its OAuth state to the social sign-in failure", async () => {
    const response = await auth.handler(browserRequest(`${PROVIDER_CALLBACK}?code=provider-code`))

    expect(response.status).toBe(HTTP_STATUS.FOUND)
    const { error } = redirectError(response)
    expect(error).toBe("state_not_found")
    expect(authErrorKeyFromSearch(error)).toBe("socialSignInFailed")
  })
})
