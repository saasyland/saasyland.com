import type { ComponentProps } from "react"

import type { DocsLayout } from "@fumadocs/base-ui/layouts/docs"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Outlet, RouterProvider, createMemoryHistory, createRootRouteWithContext, createRouter, notFound } from "@tanstack/react-router"
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react"
import { IntlProvider } from "use-intl"
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test"

import { selectTriggerNamed } from "~/src/platform/testing/lib/select-trigger-name"

import type * as docsIntegration from "~/src/integrations/fumadocs/fumadocs.docs"
import { loadDocsPage } from "~/src/integrations/fumadocs/fumadocs.docs"
import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import { Route as SiteRoute } from "~/src/routes/_site"
import { Route as DocsRoute } from "~/src/routes/_site.docs"
import { Route as DocsPageRoute } from "~/src/routes/_site.docs.$"
import { Route as DocsIndexRoute } from "~/src/routes/_site.docs.index"

import { DOCS_CONTENT_ID } from "~/src/data/navigation.constants"

import { docsContent } from "~/src/presentation/components/custom/docs-content"

import localeSwitcherMessages from "~/messages/en-US/components.custom.locale-switcher.json"
import navigationMessages from "~/messages/en-US/components.custom.navigation.json"
import notFoundMessages from "~/messages/en-US/errors.not-found.json"
import contentNavigationMessages from "~/messages/en-US/navigation.content.json"
import { APP_GITHUB_OWNER, APP_GITHUB_REPO, APP_GITHUB_URL } from "~/src/presentation/branding"
import type { RouterContext } from "~/src/router"
import { ROUTES } from "~/src/routes"

const LAYOUT_DATA: typeof DocsRoute.types.loaderData = {
  tree: { $fumadocs_loader: "page-tree", data: { children: [], name: "Documentation" } },
}

vi.mock("~/src/integrations/fumadocs/fumadocs.source", () => ({ source: {} }))
vi.mock("~/src/integrations/fumadocs/fumadocs.docs", async (original) => ({
  ...(await original<typeof docsIntegration>()),
  loadDocsPage: vi.fn(),
}))
vi.mock("~/src/presentation/components/custom/docs-content", () => ({
  docsContent: { useContent: vi.fn(() => <p>Documentation content</p>) },
}))
vi.mock("~/src/presentation/components/custom/docs-toolbar", () => ({
  DocsToolbar: () => <p>Docs toolbar</p>,
}))
vi.mock(import("@fumadocs/base-ui/layouts/docs"), async (original) => ({
  ...(await original()),
  DocsLayout: ({ children, nav, sidebar, links, slots, themeSwitch }: ComponentProps<typeof DocsLayout>) => (
    <div>
      {slots?.header && <slots.header />}
      <nav aria-label="Documentation navigation">
        {typeof nav?.title === "function" ? undefined : <a href={nav?.url}>{nav?.title}</a>}
        {links?.map((link, index) => (link.type === "custom" ? <div key={index}>{link.children}</div> : undefined))}
      </nav>
      {typeof sidebar === "object" && sidebar.footer}
      <main>{children}</main>
      <span data-testid="builtin-theme-switch">{String(themeSwitch?.enabled)}</span>
      <span data-testid="sidebar-collapsible">{typeof sidebar === "object" && String(sidebar.collapsible)}</span>
    </div>
  ),
}))

const createDocsRouter = ({ href, layout }: { href: string; layout: () => unknown }) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const root = createRootRouteWithContext<RouterContext>()({ component: Outlet })
  Object.assign(SiteRoute.options, { getParentRoute: () => root, id: "_site" })
  Object.assign(DocsRoute.options, { getParentRoute: () => SiteRoute, id: "/docs", loader: layout, path: "/docs" })
  Object.assign(DocsIndexRoute.options, { getParentRoute: () => DocsRoute, id: "/", path: "/" })
  Object.assign(DocsPageRoute.options, { getParentRoute: () => DocsRoute, id: "/$", path: "/$" })
  const docs = DocsRoute.addChildren([DocsIndexRoute, DocsPageRoute])
  return createRouter({
    context: { queryClient },
    defaultPendingMs: 0,
    history: createMemoryHistory({ initialEntries: [href] }),
    routeTree: root.addChildren([SiteRoute.addChildren([docs])]),
  })
}

const renderDocs = (router: ReturnType<typeof createDocsRouter>) =>
  render(
    <QueryClientProvider client={router.options.context.queryClient}>
      <IntlProvider locale="en-US" messages={getTestMessages("en-US")} timeZone="UTC">
        <RouterProvider router={router} />
      </IntlProvider>
    </QueryClientProvider>,
  )

beforeEach(() => {
  vi.mocked(loadDocsPage).mockImplementation((slug = "") =>
    Promise.resolve({
      description: "Documentation description",
      locale: "en-US" as const,
      path: `${slug || "index"}.mdx`,
      pathname: slug ? `/docs/${slug}` : "/docs",
      section: undefined,
      title: slug || "Introduction",
    }),
  )
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe = vi.fn()
      unobserve = vi.fn()
      disconnect = vi.fn()
    },
  )
  vi.stubGlobal("CSS", { supports: () => true })
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
  const router = createDocsRouter({ href, layout: () => LAYOUT_DATA })
  renderDocs(router)
  await act(() => router.load())
  expect(screen.getByText("Documentation content")).toBeVisible()
  expect(screen.getAllByRole("navigation", { name: navigationMessages.ariaLabel })).toHaveLength(1)
  expect(screen.getByRole("banner").nextElementSibling).toHaveTextContent("Docs toolbar")
  expect(screen.queryByRole("link", { name: navigationMessages.skipToContent })).not.toBeInTheDocument()
  expect(
    within(screen.getByRole("navigation", { name: "Documentation navigation" })).getByRole("link", {
      name: contentNavigationMessages.header.docs,
    }),
  ).toHaveAttribute("href", ROUTES.DOCS)
  expect(screen.getByRole("link", { name: `${APP_GITHUB_OWNER}/${APP_GITHUB_REPO}` })).toHaveAttribute("href", APP_GITHUB_URL)
  expect(screen.getByRole("button", { name: selectTriggerNamed(localeSwitcherMessages.label) })).toHaveTextContent("English")
  expect(screen.getByTestId("builtin-theme-switch")).toHaveTextContent("false")
  expect(screen.getByTestId("sidebar-collapsible")).toHaveTextContent("false")
  expect(screen.getByRole("contentinfo")).toBeInTheDocument()
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
  router.options.context.queryClient.clear()
})

it("shows the docs-shaped skeleton while the documentation layout loads", async () => {
  const { container } = renderDocs(createDocsRouter({ href: "/docs", layout: () => new Promise(() => {}) }))
  await waitFor(() => {
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument()
  })
  expect(screen.getByRole("navigation", { name: navigationMessages.ariaLabel })).toBeVisible()
  expect(screen.queryByText("Documentation content")).not.toBeInTheDocument()
})

it("shows a missing docs page as the not-found page in the docs' content landmark", async () => {
  vi.mocked(loadDocsPage).mockRejectedValue(notFound())
  const router = createDocsRouter({ href: "/docs/missing", layout: () => LAYOUT_DATA })
  renderDocs(router)
  await act(() => router.load())

  const heading = screen.getByRole("heading", { level: 1, name: notFoundMessages.metadata.title })
  expect(heading.closest("main")).toHaveAttribute("id", DOCS_CONTENT_ID)
  expect(screen.queryByText("Documentation content")).not.toBeInTheDocument()
  expect(router.state.matches.at(-1)?.status).toBe("notFound")
  router.options.context.queryClient.clear()
})
