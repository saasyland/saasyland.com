import type { ComponentProps } from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Outlet, RouterProvider, createMemoryHistory, createRootRouteWithContext, createRouter } from "@tanstack/react-router"
import { act, cleanup, render, screen } from "@testing-library/react"
import type { DocsLayout } from "fumadocs-ui/layouts/docs"
import { IntlProvider } from "use-intl"
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test"

import type * as docsIntegration from "~/src/integrations/fumadocs/fumadocs.docs"
import { docsLoader, getDocsTree, loadDocsPage } from "~/src/integrations/fumadocs/fumadocs.docs"
import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import { Route as DocsRoute } from "~/src/routes/docs"
import { Route as DocsPageRoute } from "~/src/routes/docs.$"
import { Route as DocsIndexRoute } from "~/src/routes/docs.index"

import { APP_NAME } from "~/src/presentation/branding"
import type { RouterContext } from "~/src/router"

vi.mock("collections/server", () => ({ blog: [], docs: { toFumadocsSource: () => ({ files: [] }) } }))
vi.mock("~/src/integrations/fumadocs/fumadocs.docs", async (original) => {
  const actual = await original<typeof docsIntegration>()
  return {
    ...actual,
    docsLoader: { ...actual.docsLoader, useContent: vi.fn(() => <p>Documentation content</p>) },
    getDocsTree: vi.fn(),
    loadDocsPage: vi.fn(),
  }
})
vi.mock(import("fumadocs-ui/layouts/docs"), async (original) => ({
  ...(await original()),
  DocsLayout: ({ children, nav, sidebar, links, themeSwitch }: ComponentProps<typeof DocsLayout>) => (
    <div>
      <nav aria-label="Documentation navigation">
        {typeof nav?.title === "function" ? undefined : nav?.title}
        {links?.map((link, index) => (link.type === "custom" ? <div key={index}>{link.children}</div> : undefined))}
      </nav>
      {typeof sidebar === "object" && sidebar.footer}
      <main>{children}</main>
      <span data-testid="builtin-theme-switch">{String(themeSwitch?.enabled)}</span>
    </div>
  ),
}))

beforeEach(() => {
  vi.mocked(getDocsTree).mockResolvedValue({ tree: { $fumadocs_loader: "page-tree", data: { children: [], name: "Documentation" } } })
  vi.mocked(loadDocsPage).mockImplementation((slug = "") =>
    Promise.resolve({
      description: "Documentation description",
      path: `${slug || "index"}.mdx`,
      pathname: slug ? `/docs/${slug}` : "/docs",
      title: slug || "Introduction",
    }),
  )
  vi.stubGlobal("scrollTo", vi.fn())
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: false,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  )
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

it.each([
  { href: "/docs", slug: undefined, path: "index.mdx", title: "Introduction" },
  { href: "/docs/getting-started", slug: "getting-started", path: "getting-started.mdx", title: "getting-started" },
])("loads documentation and its metadata at $href", async ({ href, slug, path, title }) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const root = createRootRouteWithContext<RouterContext>()({ component: Outlet })
  Object.assign(DocsRoute.options, { getParentRoute: () => root, id: "/docs", path: "/docs" })
  Object.assign(DocsIndexRoute.options, { getParentRoute: () => DocsRoute, id: "/", path: "/" })
  Object.assign(DocsPageRoute.options, { getParentRoute: () => DocsRoute, id: "/$", path: "/$" })
  const router = createRouter({
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [href] }),
    routeTree: root.addChildren([DocsRoute.addChildren([DocsIndexRoute, DocsPageRoute])]),
  })
  render(
    <QueryClientProvider client={queryClient}>
      <IntlProvider locale="en-US" messages={getTestMessages("en-US")} timeZone="UTC">
        <RouterProvider router={router} />
      </IntlProvider>
    </QueryClientProvider>,
  )
  await act(() => router.load())
  expect(screen.getByText("Documentation content")).toBeVisible()
  expect(screen.getByRole("navigation", { name: "Documentation navigation" })).toHaveTextContent(APP_NAME)
  expect(screen.getByRole("link", { name: "saasyland/saasyland.com" })).toHaveAttribute(
    "href",
    "https://github.com/saasyland/saasyland.com",
  )
  expect(screen.getByRole("button", { name: /English/u })).toBeVisible()
  expect(screen.getByTestId("builtin-theme-switch")).toHaveTextContent("false")
  expect(docsLoader.useContent).toHaveBeenCalledWith(path, { path })
  if (slug === undefined) {
    expect(loadDocsPage).toHaveBeenCalledWith()
  } else {
    expect(loadDocsPage).toHaveBeenCalledWith(slug)
  }
  expect(router.state.matches.at(-1)?.loaderData).toMatchObject({
    metadata: { description: "Documentation description", locale: "en-US", pathname: href, title },
  })
  expect(router.state.matches.some((match) => match.links?.some((link) => link?.rel === "stylesheet") === true)).toBe(true)
  queryClient.clear()
})
