import { createElement } from "react"
import { renderToString } from "react-dom/server"

import { useQueryClient } from "@tanstack/react-query"
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router"
import { getGlobalStartContext } from "@tanstack/react-start"
import { getGlobalStartContext as readStartContext } from "@tanstack/start-client-core"
import { runWithStartContext } from "@tanstack/start-storage-context"
import { IntlProvider } from "use-intl/react"
import { afterEach, expect, it, vi } from "vite-plus/test"

import { recheckRefusedSession } from "~/src/integrations/better-auth/auth.routes"
import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"

import { getRouter } from "~/src/router"

const beforeLoad = vi.hoisted(() => vi.fn<() => void>())

vi.mock(import("~/src/integrations/better-auth/auth.routes"), async (importOriginal) => ({
  ...(await importOriginal()),
  recheckRefusedSession: vi.fn<typeof recheckRefusedSession>().mockResolvedValue(undefined),
}))

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

afterEach(() => {
  beforeLoad.mockReset()
  vi.mocked(recheckRefusedSession).mockClear()
})

it("gives the router the nonce of the request it renders, so its scripts match the page's policy", () => {
  vi.mocked(getGlobalStartContext).mockImplementationOnce(readStartContext)
  const context = {
    contextAfterGlobalMiddlewares: { nonce: "0123456789abcdef0123456789abcdef" },
    getRouter,
    handlerType: "router" as const,
    request: new Request("http://localhost/"),
    startOptions: {},
  }

  expect(runWithStartContext(context, getRouter).options.ssr).toStrictEqual({ nonce: "0123456789abcdef0123456789abcdef" })
})

it("leaves the nonce out where no request is rendered, as in the browser and in prerendered pages", () => {
  expect(getRouter().options.ssr).toStrictEqual({})
})

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

it("hands every failed query and mutation to the session recheck with the router that runs the guards", async () => {
  const router = getRouter()
  const { queryClient } = router.options.context
  const refused = new Error(ERROR_CODES.UNAUTHORIZED)

  await expect(queryClient.query({ queryFn: () => Promise.reject(refused), queryKey: ["refused"] })).rejects.toBe(refused)
  await expect(
    queryClient
      .getMutationCache()
      .build(queryClient, { mutationFn: () => Promise.reject(refused) })
      .execute(undefined),
  ).rejects.toBe(refused)

  expect(vi.mocked(recheckRefusedSession).mock.calls).toEqual([
    [{ error: refused, queryClient, router }],
    [{ error: refused, queryClient, router }],
  ])
})

it("leaves loading to TanStack Query: a preloaded route runs its loader again, which reads the query cache", () => {
  expect(getRouter().options).toMatchObject({ defaultPreloadStaleTime: 0 })
  expect(getRouter().options.defaultStaleTime).toBeUndefined()
})
