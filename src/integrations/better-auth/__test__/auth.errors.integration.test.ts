import { describe, expect, it } from "vite-plus/test"

import { AUTH_TEST_BASE_URL, createAuthTestInstance } from "~/src/integrations/better-auth/__test__/fixtures/auth.test-instance"
import { authErrorKey, authErrorKeyFromSearch } from "~/src/integrations/better-auth/auth.errors"

import { ROUTES } from "~/src/routes"

const PROVIDER = "github"
const AUTH_URL = `${AUTH_TEST_BASE_URL}${ROUTES.API_AUTH_BASE}`
const PROVIDER_CALLBACK_URL = `${AUTH_URL}${ROUTES.API_AUTH.CALLBACK}/${PROVIDER}`

const authContext = await createAuthTestInstance({ rateLimitEnabled: true, rateLimitMax: 1 })

const readClientError = async (response: Response): Promise<Record<string, unknown>> => ({
  ...(await response.json<Record<string, unknown>>()),
  status: response.status,
  statusText: response.statusText,
})

const signInWithUnknownAccount = (): Promise<Response> => {
  const body = JSON.stringify({ email: `nobody-${crypto.randomUUID()}@example.test`, password: "WrongPass1!" })
  return authContext.auth.handler(
    new Request(`${AUTH_URL}${ROUTES.API_AUTH.SIGN_IN_EMAIL}`, { body, headers: { "Content-Type": "application/json" }, method: "POST" }),
  )
}

const redirectError = (response: Response): { error: string | null; pathname: string } => {
  const location = new URL(response.headers.get("location") ?? "", AUTH_TEST_BASE_URL)
  return { error: location.searchParams.get("error"), pathname: location.pathname }
}

describe("Better Auth responses mapped to user-facing errors", () => {
  it("keeps sign-in failures generic and turns the rate limiter's code-less 429 into the retry message", async () => {
    const rejected = await signInWithUnknownAccount()
    const limited = await signInWithUnknownAccount()

    expect(rejected.status).toBe(401)
    expect(authErrorKey(await readClientError(rejected))).toBe("invalidEmailOrPassword")
    expect(limited.status).toBe(429)
    const limitedError = await readClientError(limited)
    expect(limitedError).not.toHaveProperty("code")
    expect(authErrorKey(limitedError)).toBe("tooManyRequests")
  })

  it("sends a provider cancellation back to the per-flow error page with a mappable code", async () => {
    const started = await authContext.auth.api.signInSocial({
      body: { callbackURL: ROUTES.AUTH_CALLBACK, errorCallbackURL: ROUTES.SIGN_IN, provider: PROVIDER },
      headers: new Headers({ origin: AUTH_TEST_BASE_URL }),
      returnHeaders: true,
    })
    const state = new URL(started.response.url ?? "").searchParams.get("state")
    const cookie = started.headers
      .getSetCookie()
      .map((entry) => entry.split(";")[0])
      .join("; ")
    const query = new URLSearchParams({ error: "access_denied", error_description: "Call +1 555 0100 to unlock", state: state ?? "" })

    const response = await authContext.auth.handler(new Request(`${PROVIDER_CALLBACK_URL}?${query}`, { headers: { cookie } }))

    expect(response.status).toBe(302)
    const { error, pathname } = redirectError(response)
    expect(pathname).toBe(ROUTES.SIGN_IN)
    expect(authErrorKeyFromSearch(error ?? undefined)).toBe("signInCancelled")
  })

  it("maps a callback that lost its OAuth state to the social sign-in failure", async () => {
    const response = await authContext.auth.handler(new Request(`${PROVIDER_CALLBACK_URL}?code=provider-code`))

    expect(response.status).toBe(302)
    const { error } = redirectError(response)
    expect(error).toBe("state_not_found")
    expect(authErrorKeyFromSearch(error ?? undefined)).toBe("socialSignInFailed")
  })
})
