import { describe, expect, it, vi } from "vite-plus/test"

import { Route as SearchRoute } from "~/src/routes/api/search"

const { searchHandler } = vi.hoisted(() => ({
  searchHandler: vi.fn<(request: Request) => Promise<Response>>(),
}))

vi.mock("~/src/integrations/fumadocs/fumadocs.search", () => ({ search: { GET: searchHandler } }))

describe("API route forwarding", () => {
  it("preserves the search query, locale and returned search response", async () => {
    const request = new Request("https://example.com/api/search?query=auth&locale=pl-PL")
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
