import { createElement } from "react"
import { renderToString } from "react-dom/server"

import { useQueryClient } from "@tanstack/react-query"
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router"
import { IntlProvider } from "use-intl/react"
import { afterEach, expect, it, vi } from "vite-plus/test"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

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

it("renders a translated root loading failure during SSR without private details", async () => {
  beforeLoad.mockImplementation(() => {
    throw new Error("private server failure")
  })
  const router = getRouter()
  router.update({ context: router.options.context, history: createMemoryHistory({ initialEntries: ["/"] }) })
  await router.load()
  const html = renderToString(
    <IntlProvider locale="en-US" messages={getTestMessages("en-US")}>
      <RouterProvider router={router} />
    </IntlProvider>,
  )
  expect(html).toContain("Something went wrong")
  expect(html).toContain("Reload")
  expect(html).not.toContain("private server failure")
})
