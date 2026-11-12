import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Outlet, RouterProvider, createMemoryHistory, createRootRouteWithContext, createRouter } from "@tanstack/react-router"
import { act, cleanup, render, screen } from "@testing-library/react"
import { IntlProvider } from "use-intl"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import type { BlogPostSummary } from "~/src/integrations/fumadocs/fumadocs.source"
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

import componentsNavigationMessages from "~/messages/en-US/components.custom.navigation.json"
import pagesBlogMessages from "~/messages/en-US/pages.blog.json"
import pagesLandingMessages from "~/messages/en-US/pages.landing.json"
import pagesLegalLicenceMessages from "~/messages/en-US/pages.legal.licence.json"
import pagesLegalPrivacyMessages from "~/messages/en-US/pages.legal.privacy.json"
import pagesLegalRefundsMessages from "~/messages/en-US/pages.legal.refunds.json"
import pagesLegalTermsMessages from "~/messages/en-US/pages.legal.terms.json"
import pagesPremiumMessages from "~/messages/en-US/pages.premium.json"
import type { RouterContext } from "~/src/router"

type BlogPost = (typeof BlogPostRoute.types.loaderData)["post"]

const messages = getTestMessages("en-US")

const summary = (title: string, slug: string): BlogPostSummary => ({
  date: "2026-09-01",
  featured: false,
  readingTimeMinutes: 5,
  summary: "Article summary",
  tags: ["React"],
  title,
  url: `/blog/${slug}`,
})

const NOTES = [summary("Featured", "featured"), summary("Recent", "recent"), summary("Older", "older")]

const COMPLETE: BlogPost = {
  ...summary("Complete guide", "complete"),
  authorName: "Ada",
  faq: [{ answer: "Because.", question: "Why?" }],
  image: "/article.webp",
  path: "complete.en-US.mdx",
  toc: [
    { depth: 2, title: "Introduction", url: "#intro" },
    { depth: 3, title: "Step 1 — Deploy", url: "#deploy" },
    { depth: 3, title: "Ship it today", url: "#ship" },
  ],
  updated: undefined,
}

const MINIMAL: BlogPost = {
  ...COMPLETE,
  authorName: " ",
  faq: undefined,
  image: undefined,
  path: "minimal.en-US.mdx",
  summary: undefined,
  tags: [],
  title: "Minimal",
  toc: [],
  url: "/blog/minimal",
}

vi.mock("collections/server", () => ({ blog: [], docs: { toFumadocsSource: () => ({ files: [] }) } }))
vi.mock(import("~/src/integrations/use-intl/i18n.messages"), async (original) => ({
  ...(await original()),
  preloadNamespaces: vi.fn(() => Promise.resolve()),
}))
vi.mock("~/src/presentation/components/custom/blog-content", () => ({
  blogContent: { useContent: vi.fn(() => <p>Article content</p>) },
}))

const routers: ReturnType<typeof createMarketingRouter>[] = []

const createMarketingRouter = ({ path, post, posts }: { path: string; post: BlogPost; posts: BlogPostSummary[] }) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(starCountQuery.queryKey, 456)
  const root = createRootRouteWithContext<RouterContext>()({ component: Outlet })
  Object.assign(LandingRoute.options, { getParentRoute: () => root, id: "_landing" })
  Object.assign(BlogRoute.options, { getParentRoute: () => root, id: "/blog", path: "/blog" })
  Object.assign(HomeRoute.options, {
    getParentRoute: () => LandingRoute,
    id: "/",
    loader: (): typeof HomeRoute.types.loaderData => ({ locale: "en-US", metadata: pagesLandingMessages.metadata, posts }),
    path: "/",
  })
  for (const [route, pathName] of [
    [LicenceRoute, "/licence"],
    [PremiumRoute, "/premium"],
    [PrivacyRoute, "/privacy"],
    [RefundsRoute, "/refunds"],
    [TermsRoute, "/terms"],
  ] as const) {
    Object.assign(route.options, { getParentRoute: () => LandingRoute, id: pathName, path: pathName })
  }
  Object.assign(BlogIndexRoute.options, {
    getParentRoute: () => BlogRoute,
    id: "/",
    loader: (): typeof BlogIndexRoute.types.loaderData => ({ locale: "en-US", metadata: pagesBlogMessages.metadata, posts }),
    path: "/",
  })
  Object.assign(BlogPostRoute.options, {
    getParentRoute: () => BlogRoute,
    id: "/$",
    loader: (): typeof BlogPostRoute.types.loaderData => ({ locale: "en-US", post }),
    path: "/$",
  })
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

const renderRoute = async (path: string, { post = COMPLETE, posts = NOTES }: { post?: BlogPost; posts?: BlogPostSummary[] } = {}) => {
  const router = createMarketingRouter({ path, post, posts })
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

  it("lists the latest notes in the order the server selected them, with their reading time", async () => {
    await renderRoute("/")
    const titles = new Set(NOTES.map((note) => note.title))
    const notes = screen.getAllByRole("heading", { level: 3 }).filter((heading) => titles.has(heading.textContent))
    expect(notes.map((heading) => heading.textContent)).toEqual(["Featured", "Recent", "Older"])
    expect(screen.getAllByText(/5 min read/u).length).toBeGreaterThan(0)
  })

  it("renders the empty blog state with its stylesheet", async () => {
    const router = await renderRoute("/blog", { posts: [] })
    expect(screen.getByRole("heading", { name: pagesBlogMessages.index.title })).toBeVisible()
    expect(screen.getByText(pagesBlogMessages.index.empty)).toBeVisible()
    expect(router.state.matches.some((match) => match.links?.some((link) => link?.rel === "stylesheet") === true)).toBe(true)
  })

  it("lists blog posts in the order the server returned them", async () => {
    await renderRoute("/blog")
    const titles = new Set(NOTES.map((note) => note.title))
    expect(
      screen
        .getAllByRole("heading", { level: 2 })
        .map((heading) => heading.textContent)
        .filter((title) => titles.has(title)),
    ).toEqual(["Featured", "Recent", "Older"])
  })

  it("renders an article with its metadata, hero image, structured data and table of contents", async () => {
    await renderRoute("/blog/complete")
    expect(screen.getByRole("heading", { name: "Complete guide" })).toBeVisible()
    expect(screen.getByText("Article content")).toBeVisible()
    expect(screen.getByText("Article summary")).toBeVisible()
    expect(screen.getByText("Ada")).toBeVisible()
    expect(screen.getAllByRole("link", { name: "Introduction" }).every((link) => link.getAttribute("href") === "#intro")).toBe(true)
    expect(screen.getAllByRole("link", { name: "Step 1 — Deploy" }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole("link", { name: "Ship it today" }).every((link) => link.getAttribute("href") === "#ship")).toBe(true)
    expect(document.querySelector('img[src="/article.webp"]')).toHaveAttribute("fetchpriority", "high")
    expect(document.querySelector('script[type="application/ld+json"]')).toHaveTextContent("FAQPage")
  })

  it("renders a minimal article without empty summary, author, image or tags", async () => {
    await renderRoute("/blog/minimal", { post: MINIMAL })
    expect(screen.getByRole("heading", { name: "Minimal" })).toBeVisible()
    expect(screen.queryByText("Article summary")).not.toBeInTheDocument()
    expect(document.querySelector('img[src=""]')).not.toBeInTheDocument()
  })
})
