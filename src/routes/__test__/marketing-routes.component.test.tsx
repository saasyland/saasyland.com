import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Outlet, RouterProvider, createMemoryHistory, createRootRouteWithContext, createRouter } from "@tanstack/react-router"
import { act, cleanup, render, screen } from "@testing-library/react"
import { IntlProvider } from "use-intl"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import type * as importBlog from "~/src/integrations/fumadocs/fumadocs.blog"
import { type BlogPostSummary, blogPostsQuery, getBlogPost } from "~/src/integrations/fumadocs/fumadocs.blog"
import { blogLoader } from "~/src/integrations/fumadocs/fumadocs.blog.loader"
import { starCountQuery } from "~/src/integrations/github/github.queries"
import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"
import { loadRouteMessages } from "~/src/integrations/use-intl/i18n.metadata"

import { Route as LandingRoute } from "~/src/routes/_landing"
import { Route as HomeRoute } from "~/src/routes/_landing.index"
import { Route as LicenceRoute } from "~/src/routes/_landing.licence"
import { Route as PremiumRoute } from "~/src/routes/_landing.premium"
import { Route as PrivacyRoute } from "~/src/routes/_landing.privacy"
import { Route as RefundsRoute } from "~/src/routes/_landing.refunds"
import { Route as TermsRoute } from "~/src/routes/_landing.terms"
import { Route as BlogRoute } from "~/src/routes/blog"
import { Route as BlogPostRoute } from "~/src/routes/blog.$"
import { Route as BlogIndexRoute } from "~/src/routes/blog.index"

import type { RouterContext } from "~/src/router"

const messages = getTestMessages("en-US")
const originalBlogLoader = BlogPostRoute.options.loader
const summary = (title: string, data: Partial<BlogPostSummary["data"]> = {}): BlogPostSummary => ({
  data: {
    authorImage: undefined,
    authorName: "Ada",
    date: new Date("2026-09-01"),
    description: "Article summary",
    excerpt: undefined,
    featured: false,
    image: undefined,
    published: true,
    readingTimeMinutes: 5,
    tags: ["React"],
    title,
    updated: undefined,
    ...data,
  },
  path: `${title}.mdx`,
  url: `/blog/${title}`,
})

vi.mock("collections/server", () => ({ blog: [], docs: { toFumadocsSource: () => ({ files: [] }) } }))
vi.mock(import("~/src/integrations/use-intl/i18n.metadata"), async (original) => ({
  ...(await original()),
  loadRouteMessages: vi.fn(({ pathname }: Parameters<typeof loadRouteMessages>[0]) =>
    Promise.resolve({ metadata: { description: "Description", locale: "en-US" as const, pathname, title: "Title" } }),
  ),
}))
vi.mock(import("~/src/integrations/use-intl/i18n.messages"), async (original) => ({
  ...(await original()),
  preloadNamespaces: vi.fn(() => Promise.resolve()),
}))
vi.mock("~/src/integrations/fumadocs/fumadocs.blog", async (original) => ({
  ...(await original<typeof importBlog>()),
  getBlogPost: vi.fn(),
}))
vi.mock("~/src/integrations/fumadocs/fumadocs.blog.loader", () => ({
  blogLoader: { preload: vi.fn(() => Promise.resolve()), useContent: vi.fn(() => <p>Article content</p>) },
}))

const routers: ReturnType<typeof createMarketingRouter>[] = []

const createMarketingRouter = (path: string, posts: BlogPostSummary[]) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(blogPostsQuery().queryKey, posts)
  queryClient.setQueryData(starCountQuery.queryKey, 456)
  const root = createRootRouteWithContext<RouterContext>()({ component: Outlet })
  Object.assign(LandingRoute.options, { getParentRoute: () => root, id: "_landing" })
  Object.assign(BlogRoute.options, { getParentRoute: () => root, id: "/blog", path: "/blog" })
  for (const [route, pathName] of [
    [HomeRoute, "/"],
    [LicenceRoute, "/licence"],
    [PremiumRoute, "/premium"],
    [PrivacyRoute, "/privacy"],
    [RefundsRoute, "/refunds"],
    [TermsRoute, "/terms"],
  ] as const) {
    Object.assign(route.options, { getParentRoute: () => LandingRoute, id: pathName, path: pathName })
  }
  Object.assign(BlogIndexRoute.options, { getParentRoute: () => BlogRoute, id: "/", path: "/" })
  Object.assign(BlogPostRoute.options, { getParentRoute: () => BlogRoute, id: "/$", path: "/$" })
  return createRouter({
    context: { queryClient },
    defaultPendingMinMs: 0,
    history: createMemoryHistory({ initialEntries: [path] }),
    routeTree: root.addChildren([
      LandingRoute.addChildren([HomeRoute, LicenceRoute, PremiumRoute, PrivacyRoute, RefundsRoute, TermsRoute]),
      BlogRoute.addChildren([BlogIndexRoute, BlogPostRoute]),
    ]),
  })
}

const renderRoute = async (path: string, posts: BlogPostSummary[] = []) => {
  const router = createMarketingRouter(path, posts)
  routers.push(router)
  render(
    <QueryClientProvider client={router.options.context.queryClient}>
      <IntlProvider locale="en-US" messages={messages} timeZone="UTC">
        <RouterProvider router={router} />
      </IntlProvider>
    </QueryClientProvider>,
  )
  await act(() => router.load())
  return router
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe = vi.fn()
      unobserve = vi.fn()
      disconnect = vi.fn()
    },
  )
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: true,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  )
  vi.stubGlobal("CSS", { supports: () => true })
  vi.stubGlobal("scrollTo", vi.fn())
})

afterEach(() => {
  if (originalBlogLoader) {
    BlogPostRoute.options.loader = originalBlogLoader
  }
  cleanup()
  for (const router of routers) {
    router.options.context.queryClient.clear()
  }
  routers.length = 0
  vi.unstubAllGlobals()
})

describe("public route content", () => {
  it.each(["privacy", "terms", "refunds", "licence"] as const)("loads and renders the complete %s document", async (document) => {
    const router = await renderRoute(`/${document}`)
    expect(screen.getByRole("heading", { name: messages.pages.legal[document].title })).toBeVisible()
    const sections: Record<string, { title: string; body: string }> = messages.pages.legal[document].sections
    for (const section of Object.values(sections)) {
      expect(screen.getByRole("heading", { name: section.title })).toBeVisible()
      expect(screen.getByText(section.body.replaceAll(/\s+/gu, " "))).toBeVisible()
    }
    expect(loadRouteMessages).toHaveBeenCalledWith(
      expect.objectContaining({ metadataNamespace: `pages.legal.${document}`, pathname: `/${document}` }),
    )
    expect(router.state.matches.at(-1)?.status).toBe("success")
  })

  it("loads the premium page metadata and translated content", async () => {
    await renderRoute("/premium")
    expect(screen.getByText(messages.pages.premium.title)).toBeVisible()
    expect(loadRouteMessages).toHaveBeenCalledWith(expect.objectContaining({ pathname: "/premium", metadataNamespace: "pages.premium" }))
  })

  it("renders the landing page with cached stars, installation controls and public navigation", async () => {
    await renderRoute("/")
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("300+ hour head start")
    expect(screen.getByText("456", { selector: "dd" })).toBeVisible()
    expect(screen.getAllByRole("tab", { name: "bun" })).toHaveLength(2)
    expect(screen.getByRole("contentinfo")).toBeVisible()
    expect(screen.getByRole("navigation", { name: messages.components.navigation.ariaLabel })).toBeVisible()
  })

  it("renders the empty blog state with its stylesheet", async () => {
    const router = await renderRoute("/blog")
    expect(screen.getByRole("heading", { name: messages.pages.blog.index.title })).toBeVisible()
    expect(screen.getByText(messages.pages.blog.index.empty)).toBeVisible()
    expect(router.state.matches.some((match) => match.links?.some((link) => link?.rel === "stylesheet") === true)).toBe(true)
  })

  it("orders published blog posts by date and hides drafts", async () => {
    await renderRoute("/blog", [
      summary("Older"),
      summary("Draft", { published: false }),
      summary("Recent", { date: new Date("2026-09-02") }),
    ])
    expect(
      screen
        .getAllByRole("heading", { level: 2 })
        .filter((heading) => ["Older", "Recent"].includes(heading.textContent))
        .map((heading) => heading.textContent),
    ).toEqual(["Recent", "Older"])
    expect(screen.queryByRole("link", { name: "Draft" })).not.toBeInTheDocument()
  })

  it("preloads article content and renders metadata, hero image, structured data and table of contents", async () => {
    vi.mocked(getBlogPost).mockResolvedValue({
      ...summary("Complete", { image: "/article.webp" }),
      data: { ...summary("Complete", { image: "/article.webp" }).data, faq: undefined },
      toc: [{ depth: 2, title: "Introduction", url: "#intro" }],
    })
    const router = await renderRoute("/blog/Complete")
    expect(getBlogPost).toHaveBeenCalledWith({ data: "Complete" })
    expect(blogLoader.preload).toHaveBeenCalledWith("Complete.mdx")
    expect(screen.getByRole("heading", { name: "Complete" })).toBeVisible()
    expect(screen.getByText("Article content")).toBeVisible()
    expect(screen.getByText("Article summary")).toBeVisible()
    expect(screen.getByText("Ada")).toBeVisible()
    expect(screen.getAllByRole("link", { name: "Introduction" }).every((link) => link.getAttribute("href") === "#intro")).toBe(true)
    expect(document.querySelector('img[src="/article.webp"]')).toHaveAttribute("fetchpriority", "high")
    expect(document.querySelector('script[type="application/ld+json"]')).toHaveTextContent("Complete")
    expect(router.state.matches.at(-1)?.loaderData).toMatchObject({
      metadata: { title: "Complete", description: "Article summary", pathname: "/blog/Complete" },
    })
  })

  it("renders a minimal article without empty summary, author, reading time, image or tags", async () => {
    const post = summary("Minimal", { authorName: " ", readingTimeMinutes: undefined, description: undefined, tags: [], image: "" })
    vi.mocked(getBlogPost).mockResolvedValue({ ...post, data: { ...post.data, faq: undefined }, toc: [] })
    const router = await renderRoute("/blog/Minimal")
    expect(screen.getByRole("heading", { name: "Minimal" })).toBeVisible()
    expect(screen.queryByText("Article summary")).not.toBeInTheDocument()
    expect(screen.queryByText(/min read/u)).not.toBeInTheDocument()
    expect(router.state.matches.at(-1)?.loaderData).toMatchObject({ metadata: { description: "" } })
  })
})

it("passes an absent article slug to the content boundary as an empty path", async () => {
  const { loader } = BlogPostRoute.options
  if (typeof loader !== "function") {
    throw new TypeError("Blog posts must have a loader")
  }
  const capture = vi.fn(loader)
  BlogPostRoute.options.loader = capture
  const post = summary("Slug contract")
  vi.mocked(getBlogPost).mockResolvedValue({ ...post, data: { ...post.data, faq: undefined }, toc: [] })
  await renderRoute("/blog/slug-contract")
  const input = capture.mock.calls[0]?.[0]
  if (!input) {
    throw new Error("Blog loader was not called")
  }
  await loader({ ...input, params: {} })
  expect(getBlogPost).toHaveBeenLastCalledWith({ data: "" })
})
