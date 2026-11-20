import { createMemoryHistory } from "@tanstack/react-router"
import { getRequest } from "@tanstack/react-start/server"
import { expect, it, vi } from "vite-plus/test"

import { Route as DocsRoute } from "~/src/routes/_site.docs"

import { getRouter } from "~/src/router"

const loadDocsIndex = vi.hoisted(() =>
  vi.fn((locale: string) =>
    Promise.resolve({ pages: {}, tree: { $fumadocs_loader: "page-tree", data: { children: [], name: `Docs ${locale}` } } }),
  ),
)

vi.mock("virtual:content-indexes", () => ({ loadDocsIndex }))

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
])("gives the documentation layout the $locale page tree from the docs index at $path", async ({ locale, path }) => {
  const router = await loadDocs(path)
  expect(loadDocsIndex).toHaveBeenCalledWith(locale)
  expect(router.state.matches.find((match) => match.routeId === DocsRoute.id)?.loaderData).toStrictEqual({
    tree: { $fumadocs_loader: "page-tree", data: { children: [], name: `Docs ${locale}` } },
  })
})
