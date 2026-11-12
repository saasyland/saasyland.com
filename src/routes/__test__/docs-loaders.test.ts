import { createMemoryHistory } from "@tanstack/react-router"
import { getRequest } from "@tanstack/react-start/server"
import { expect, it, vi } from "vite-plus/test"

import { source } from "~/src/integrations/fumadocs/fumadocs.source"

import { Route as DocsRoute } from "~/src/routes/docs"

import { getRouter } from "~/src/router"

vi.mock("collections/server", () => ({ blog: [], docs: { toFumadocsSource: () => ({ files: [] }) } }))

const loadDocs = async (path: string) => {
  vi.mocked(getRequest).mockReturnValue(new Request(`http://127.0.0.1:3000${path}`))
  const router = getRouter()
  router.update({ context: router.options.context, history: createMemoryHistory({ initialEntries: [path] }) })
  await router.load()
  return router
}

it.each([
  { locale: "en-US", path: "/docs" },
  { locale: "pl-PL", path: "/pl-PL/docs" },
])("loads the $locale page tree for the documentation layout at $path", async ({ locale, path }) => {
  const getPageTree = vi.spyOn(source, "getPageTree")
  const router = await loadDocs(path)
  expect(getPageTree).toHaveBeenCalledExactlyOnceWith(locale)
  expect(router.state.matches.find((match) => match.routeId === DocsRoute.id)?.loaderData).toEqual({
    tree: await source.serializePageTree(source.getPageTree(locale)),
  })
})
