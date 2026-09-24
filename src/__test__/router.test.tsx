import { createElement } from "react"
import { renderToString } from "react-dom/server"

import { useQueryClient } from "@tanstack/react-query"
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router"
import { afterEach, expect, it, vi } from "vite-plus/test"

import { getRouter } from "~/src/router"

const beforeLoad = vi.hoisted(() => vi.fn<() => void>())

vi.mock(import("@tanstack/react-start/server"), async (importOriginal) => ({
  ...(await importOriginal()),
  getRequest: () => new Request("http://localhost/"),
}))

vi.mock("~/src/routeTree.gen", async () => {
  const { createRootRoute } = await import("@tanstack/react-router")
  return {
    routeTree: createRootRoute({
      beforeLoad,
      component: () => createElement("p", undefined, useQueryClient().getQueryData<string>(["router-data"])),
    }),
  }
})

afterEach(() => beforeLoad.mockReset())

it("creates isolated query caches for separate requests", () => {
  const first = getRouter()
  const second = getRouter()
  expect(first.options.context.queryClient).not.toBe(second.options.context.queryClient)
})
it("renders the route through its SSR query provider", async () => {
  const router = getRouter()
  router.options.context.queryClient.setQueryData(["router-data"], "Router content")
  router.update({ context: router.options.context, history: createMemoryHistory({ initialEntries: ["/"] }) })
  await router.load()
  expect(renderToString(<RouterProvider router={router} />)).toContain("Router content")
})
it("rewrites locale paths through the native router configuration", () => {
  const router = getRouter()
  const input = router.options.rewrite?.input
  const output = router.options.rewrite?.output
  expect(input?.({ url: new URL("http://localhost/pl-PL/docs") })).toEqual(new URL("http://localhost/docs"))
  expect(output?.({ url: new URL("http://localhost/docs") })).toEqual(new URL("http://localhost/docs"))
})

it("renders a root loading failure during SSR without translation providers or private details", async () => {
  beforeLoad.mockImplementation(() => {
    throw new Error("private server failure")
  })
  const router = getRouter()
  router.update({ context: router.options.context, history: createMemoryHistory({ initialEntries: ["/"] }) })
  await router.load()
  const html = renderToString(<RouterProvider router={router} />)
  expect(html).toContain("Something went wrong")
  expect(html).toContain("Reload")
  expect(html).not.toContain("private server failure")
})
