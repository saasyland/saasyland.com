import type { ComponentProps } from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Outlet, RouterProvider, createMemoryHistory, createRootRouteWithContext, createRouter } from "@tanstack/react-router"
import { act, cleanup, render, screen, waitFor } from "@testing-library/react"
import type { DocsLayout } from "fumadocs-ui/layouts/docs"
import { IntlProvider } from "use-intl"
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test"

import { selectTriggerNamed } from "~/src/platform/testing/lib/select-trigger-name"

import type * as docsIntegration from "~/src/integrations/fumadocs/fumadocs.docs"
import { loadDocsPage } from "~/src/integrations/fumadocs/fumadocs.docs"
import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import { Route as DocsRoute } from "~/src/routes/docs"
import { Route as DocsPageRoute } from "~/src/routes/docs.$"
import { Route as DocsIndexRoute } from "~/src/routes/docs.index"

import { docsContent } from "~/src/presentation/components/custom/docs-content"

import localeSwitcherMessages from "~/messages/en-US/components.custom.locale-switcher.json"
import { APP_NAME } from "~/src/presentation/branding"
import type { RouterContext } from "~/src/router"

const { getPageTree, serializePageTree } = vi.hoisted(() => ({
  getPageTree: vi.fn(() => ({ children: [], name: "Documentation" })),
  serializePageTree: vi.fn<() => Promise<{ $fumadocs_loader: "page-tree"; data: { children: never[]; name: string } }>>(),
}))

vi.mock("~/src/integrations/fumadocs/fumadocs.source", () => ({ source: { getPageTree, serializePageTree } }))
vi.mock("~/src/integrations/fumadocs/fumadocs.docs", async (original) => ({
  ...(await original<typeof docsIntegration>()),
  loadDocsPage: vi.fn(),
}))
vi.mock("~/src/presentation/components/custom/docs-content", () => ({
  docsContent: { useContent: vi.fn(() => <p>Documentation content</p>) },
}))
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
  serializePageTree.mockResolvedValue({ $fumadocs_loader: "page-tree", data: { children: [], name: "Documentation" } })
  vi.mocked(loadDocsPage).mockImplementation((slug = "") =>
    Promise.resolve({
      description: "Documentation description",
      locale: "en-US" as const,
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
  expect(screen.getByRole("button", { name: selectTriggerNamed(localeSwitcherMessages.label) })).toHaveTextContent("English")
  expect(screen.getByTestId("builtin-theme-switch")).toHaveTextContent("false")
  expect(docsContent.useContent).toHaveBeenCalledWith(path)
  if (slug === undefined) {
    expect(loadDocsPage).toHaveBeenCalledWith()
  } else {
    expect(loadDocsPage).toHaveBeenCalledWith(slug)
  }
  expect(router.state.matches.at(-1)?.loaderData).toMatchObject({
    description: "Documentation description",
    locale: "en-US",
    pathname: href,
    title,
  })
  expect(router.state.matches.some((match) => match.links?.some((link) => link?.rel === "stylesheet") === true)).toBe(true)
  queryClient.clear()
})

it("shows the docs-shaped skeleton while the documentation layout loads", async () => {
  serializePageTree.mockReturnValue(new Promise(() => {}))
  const queryClient = new QueryClient()
  const root = createRootRouteWithContext<RouterContext>()({ component: Outlet })
  Object.assign(DocsRoute.options, { getParentRoute: () => root, id: "/docs", path: "/docs" })
  Object.assign(DocsIndexRoute.options, { getParentRoute: () => DocsRoute, id: "/", path: "/" })
  const router = createRouter({
    context: { queryClient },
    defaultPendingMs: 0,
    history: createMemoryHistory({ initialEntries: ["/docs"] }),
    routeTree: root.addChildren([DocsRoute.addChildren([DocsIndexRoute])]),
  })
  const { container } = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  await waitFor(() => {
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument()
  })
  expect(getPageTree).toHaveBeenCalledWith("en-US")
  expect(screen.queryByText("Documentation content")).not.toBeInTheDocument()
})
