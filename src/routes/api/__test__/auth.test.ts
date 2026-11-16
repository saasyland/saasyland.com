import { describe, expect, it, vi } from "vite-plus/test"

import { Route as AuthRoute } from "~/src/routes/api/auth.$"

import { createNonce } from "~/src/lib/content-security-policy"

import { getRouter } from "~/src/router"
import { ROUTES } from "~/src/routes"

const { authHandler } = vi.hoisted(() => ({
  authHandler: vi.fn<(request: Request) => Promise<Response>>(),
}))

vi.mock("~/src/integrations/better-auth/auth.server", () => ({ auth: { handler: authHandler } }))
vi.mock("collections/server", () => ({ blog: [], docs: { toFumadocsSource: () => ({ files: [] }) } }))

const AUTH_SPLAT_PATH = `${ROUTES.API_AUTH_BASE}/$`

describe("API route forwarding", () => {
  it.each([ROUTES.API_AUTH_VERIFY_EMAIL, `${ROUTES.API_AUTH_BASE}${ROUTES.API_AUTH.GET_SESSION}`])(
    "routes %s to the Better Auth route file, whose path the router generator writes",
    (path) => {
      const [matchedRoutes] = getRouter().getMatchedRoutes(path)

      expect(matchedRoutes.at(-1)).toBe(AuthRoute)
      expect(AuthRoute.fullPath).toBe(AUTH_SPLAT_PATH)
    },
  )

  it.each(["GET", "POST"] as const)("forwards auth %s requests and preserves the provider response", async (method) => {
    const request = new Request("https://example.com/api/auth/get-session", { method })
    const response = Response.json({ user: null }, { headers: { "set-cookie": "session=; Max-Age=0" } })
    authHandler.mockResolvedValueOnce(response)
    const handlers = AuthRoute.options.server?.handlers
    if (!handlers || typeof handlers === "function") {
      throw new Error("Missing auth handlers")
    }
    const handler = handlers[method]
    if (typeof handler !== "function") {
      throw new TypeError("Missing auth method")
    }
    const result = await handler({
      context: { nonce: createNonce() },
      next: () => {
        throw new Error("Auth must return its own response")
      },
      params: { _splat: "get-session" },
      pathname: "/api/auth/$",
      request,
    })
    expect(result).toBe(response)
    expect(authHandler).toHaveBeenLastCalledWith(request)
  })
})
