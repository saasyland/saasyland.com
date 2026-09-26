import { assert, describe, expect, it, vi } from "vite-plus/test"

import { Route as AuthRoute } from "~/src/routes/api/auth.$"
import { Route as ApiRoute } from "~/src/routes/api/index"
import { Route as SearchRoute } from "~/src/routes/api/search"

const { authHandler, searchHandler } = vi.hoisted(() => ({
  authHandler: vi.fn<(request: Request) => Promise<Response>>(),
  searchHandler: vi.fn<(request: Request) => Promise<Response>>(),
}))

vi.mock("~/src/integrations/better-auth/auth.server", () => ({ auth: { handler: authHandler } }))
vi.mock("~/src/integrations/fumadocs/fumadocs.search", () => ({ search: { GET: searchHandler } }))

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

  it("preserves the search query, locale and returned search response", async () => {
    const request = new Request("https://saasyland.com/api/search?query=auth&locale=pl-PL")
    const response = Response.json([{ title: "Authentication", url: "/pl-PL/docs/auth" }])
    searchHandler.mockResolvedValueOnce(response)
    const handlers = SearchRoute.options.server?.handlers
    if (!handlers || typeof handlers === "function" || typeof handlers.GET !== "function") {
      throw new Error("Missing search handler")
    }
    expect(
      await handlers.GET({
        context: undefined,
        next: () => {
          throw new Error("Search must return its own response")
        },
        params: {},
        pathname: "/api/search",
        request,
      }),
    ).toBe(response)
    expect(searchHandler).toHaveBeenCalledExactlyOnceWith(request)
  })
})

it("reports the Worker runtime through the API root", async () => {
  const handlers = ApiRoute.options.server?.handlers
  assert(typeof handlers === "object" && handlers.GET)
  const response = await handlers.GET({
    context: undefined,
    next: vi.fn(),
    params: {},
    pathname: "/api",
    request: new Request("https://saasyland.com/api/"),
  })
  assert(response instanceof Response)
  expect(response.status).toBe(200)
  await expect(response.json()).resolves.toEqual({ runtime: "cloudflare-workers" })
})
