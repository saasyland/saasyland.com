import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Outlet, RouterProvider, createMemoryHistory, createRootRouteWithContext, createRouter } from "@tanstack/react-router"
import { act, cleanup, render, screen } from "@testing-library/react"
import { IntlProvider } from "use-intl"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { blogSource } from "~/src/integrations/fumadocs/fumadocs.source"
import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

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

import { starCountQuery } from "~/src/lib/github"

import { blogContent } from "~/src/presentation/components/custom/blog-content"

import componentsNavigationMessages from "~/messages/en-US/components.custom.navigation.json"
import pagesBlogMessages from "~/messages/en-US/pages.blog.json"
import pagesLegalLicenceMessages from "~/messages/en-US/pages.legal.licence.json"
import pagesLegalPrivacyMessages from "~/messages/en-US/pages.legal.privacy.json"
import pagesLegalRefundsMessages from "~/messages/en-US/pages.legal.refunds.json"
import pagesLegalTermsMessages from "~/messages/en-US/pages.legal.terms.json"
import pagesPremiumMessages from "~/messages/en-US/pages.premium.json"
import { APP_NAME, APP_URL } from "~/src/presentation/branding"
import type { RouterContext } from "~/src/router"
import { ROUTES } from "~/src/routes"

const messages = getTestMessages("en-US")
const originalBlogLoader = BlogPostRoute.options.loader

vi.mock("collections/server", async () => {
  const { createElement } = await import("react")
  const prose = { contents: [{ content: "word ".repeat(1100), heading: undefined }], headings: [] }
  const post = (slug: string, data: Record<string, unknown>) => ({
    authorName: "Ada",
    date: "2026-09-01",
    description: "Article summary",
    info: { fullPath: `/content/blog/${slug}.en-US.mdx`, path: `${slug}.en-US.mdx` },
    published: true,
    structuredData: prose,
    tags: ["React"],
    toc: [],
    ...data,
  })
  return {
    blog: [
      post("older", { date: "2026-09-01", title: "Older" }),
      post("recent", { date: "2026-09-02", title: "Recent" }),
      post("draft", { date: "2026-09-09", published: false, title: "Draft" }),
      post("featured", { date: "2025-01-01", featured: true, title: "Featured" }),
      post("complete", {
        date: "2025-06-01",
        faq: [{ answer: "Because.", question: "Why?" }],
        image: "/article.webp",
        title: "Complete guide",
        toc: [
          { depth: 2, title: "Introduction", url: "#intro" },
          { depth: 3, title: ["Step ", 1, createElement("strong", null, " — ", createElement("em", null, "Deploy"))], url: "#deploy" },
          { depth: 3, title: [null, "Ship ", false, ["it ", createElement("code", null, "today")], createElement("br")], url: "#ship" },
        ],
      }),
      post("minimal", { authorName: " ", date: "2024-01-01", description: undefined, tags: [], title: "Minimal" }),
    ],
    docs: { toFumadocsSource: () => ({ files: [] }) },
  }
})
vi.mock(import("~/src/integrations/use-intl/i18n.messages"), async (original) => ({
  ...(await original()),
  preloadNamespaces: vi.fn(() => Promise.resolve()),
}))
vi.mock("~/src/presentation/components/custom/blog-content", () => ({
  blogContent: { preload: vi.fn(() => Promise.resolve()), useContent: vi.fn(() => <p>Article content</p>) },
}))

const routers: ReturnType<typeof createMarketingRouter>[] = []

const createMarketingRouter = (path: string) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
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

const renderRoute = async (path: string) => {
  const router = createMarketingRouter(path)
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
  it.each([
    { copy: pagesLegalPrivacyMessages, document: "privacy" },
    { copy: pagesLegalTermsMessages, document: "terms" },
    { copy: pagesLegalRefundsMessages, document: "refunds" },
    { copy: pagesLegalLicenceMessages, document: "licence" },
  ])("loads and renders the complete $document document", async ({ copy, document }) => {
    const router = await renderRoute(`/${document}`)
    expect(screen.getByRole("heading", { name: copy.title })).toBeVisible()
    const sections: Record<string, { title: string; body: string }> = copy.sections
    for (const section of Object.values(sections)) {
      expect(screen.getByRole("heading", { name: section.title })).toBeVisible()
      expect(screen.getByText(section.body.replaceAll(/\s+/gu, " "))).toBeVisible()
    }
    expect(router.state.matches.at(-1)?.loaderData).toMatchObject({ locale: "en-US", metadata: copy.metadata })
    expect(router.state.matches.at(-1)?.status).toBe("success")
  })

  it("loads the premium page metadata and translated content", async () => {
    const router = await renderRoute("/premium")
    expect(screen.getByText(pagesPremiumMessages.metadata.title)).toBeVisible()
    expect(router.state.matches.at(-1)?.loaderData).toMatchObject({ metadata: pagesPremiumMessages.metadata })
  })

  it("renders the landing page with cached stars, installation controls and public navigation", async () => {
    await renderRoute("/")
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("300+ hour head start")
    expect(screen.getByText("456", { selector: "dd" })).toBeVisible()
    expect(screen.getAllByRole("tab", { name: "bun" })).toHaveLength(2)
    expect(screen.getByRole("contentinfo")).toBeVisible()
    expect(screen.getByRole("navigation", { name: componentsNavigationMessages.ariaLabel })).toBeVisible()
  })

  it("shows featured notes first, then the newest posts, without drafts", async () => {
    await renderRoute("/")
    const notes = screen
      .getAllByRole("heading", { level: 3 })
      .filter((heading) => ["Featured", "Recent", "Older", "Complete guide"].includes(heading.textContent))
    expect(notes.map((heading) => heading.textContent)).toEqual(["Featured", "Recent", "Older"])
    expect(screen.queryByRole("link", { name: "Draft" })).not.toBeInTheDocument()
    expect(screen.getAllByText(/5 min read/u).length).toBeGreaterThan(0)
  })

  it("renders the empty blog state with its stylesheet", async () => {
    vi.spyOn(blogSource, "getPages").mockReturnValueOnce([])
    const router = await renderRoute("/blog")
    expect(screen.getByRole("heading", { name: pagesBlogMessages.index.title })).toBeVisible()
    expect(screen.getByText(pagesBlogMessages.index.empty)).toBeVisible()
    expect(router.state.matches.some((match) => match.links?.some((link) => link?.rel === "stylesheet") === true)).toBe(true)
  })

  it("orders published blog posts by date and hides drafts", async () => {
    await renderRoute("/blog")
    const titles = new Set(["Recent", "Older", "Complete guide", "Featured", "Minimal", "Draft"])
    expect(
      screen
        .getAllByRole("heading", { level: 2 })
        .map((heading) => heading.textContent)
        .filter((title) => titles.has(title)),
    ).toEqual(["Recent", "Older", "Complete guide", "Featured", "Minimal"])
    expect(screen.queryByRole("link", { name: "Draft" })).not.toBeInTheDocument()
  })

  it("preloads article content and renders metadata, hero image, structured data and table of contents", async () => {
    const router = await renderRoute("/blog/complete")
    expect(blogContent.preload).toHaveBeenCalledWith("complete.en-US.mdx")
    expect(screen.getByRole("heading", { name: "Complete guide" })).toBeVisible()
    expect(screen.getByText("Article content")).toBeVisible()
    expect(screen.getByText("Article summary")).toBeVisible()
    expect(screen.getByText("Ada")).toBeVisible()
    expect(screen.getAllByRole("link", { name: "Introduction" }).every((link) => link.getAttribute("href") === "#intro")).toBe(true)
    expect(screen.getAllByRole("link", { name: "Step 1 — Deploy" }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole("link", { name: "Ship it today" }).every((link) => link.getAttribute("href") === "#ship")).toBe(true)
    expect(document.querySelector('img[src="/article.webp"]')).toHaveAttribute("fetchpriority", "high")
    expect(document.querySelector('script[type="application/ld+json"]')).toHaveTextContent("FAQPage")
    expect(router.state.matches.at(-1)?.loaderData).toMatchObject({
      post: { summary: "Article summary", title: "Complete guide", url: "/blog/complete" },
    })
  })

  it("renders a minimal article without empty summary, author, image or tags", async () => {
    const router = await renderRoute("/blog/minimal")
    expect(screen.getByRole("heading", { name: "Minimal" })).toBeVisible()
    expect(screen.queryByText("Article summary")).not.toBeInTheDocument()
    expect(document.querySelector('img[src=""]')).not.toBeInTheDocument()
    expect(router.state.matches.at(-1)?.loaderData).toMatchObject({ post: { summary: undefined } })
  })

  it("keeps the blog index as the canonical page of a missing article", async () => {
    const router = await renderRoute("/blog/missing")
    const article = router.state.matches.find((match) => match.routeId === BlogPostRoute.id)
    expect(article?.meta).toContainEqual({ content: `${APP_URL}${ROUTES.BLOG}`, property: "og:url" })
    expect(article?.meta).toContainEqual({ title: APP_NAME })
  })

  it.each<{ _splat?: string }>([{ _splat: "draft" }, { _splat: "missing" }, { _splat: "" }, {}])(
    "treats params %j as a missing article",
    async (params) => {
      const { loader } = BlogPostRoute.options
      if (typeof loader !== "function") {
        throw new TypeError("Blog posts must have a loader")
      }
      const capture = vi.fn(loader)
      BlogPostRoute.options.loader = capture
      await renderRoute("/blog/complete")
      const input = capture.mock.calls[0]?.[0]
      if (!input) {
        throw new Error("Blog loader was not called")
      }
      await expect(loader({ ...input, params })).rejects.toMatchObject({ isNotFound: true })
    },
  )
})
