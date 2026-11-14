import { describe, expect, it, vi } from "vite-plus/test"

import { Route as AuthRoute } from "~/src/routes/api/auth.$"

const { authHandler } = vi.hoisted(() => ({
  authHandler: vi.fn<(request: Request) => Promise<Response>>(),
}))

vi.mock("~/src/integrations/better-auth/auth.server", () => ({ auth: { handler: authHandler } }))

describe("API route forwarding", () => {
  it.each(["GET", "POST"] as const)("forwards auth %s requests and preserves the provider response", async (method) => {
    const request = new Request("https://saasyland.com/api/auth/get-session", { method })
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
      context: undefined,
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
