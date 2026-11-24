import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Outlet, RouterProvider, createMemoryHistory, createRootRouteWithContext, createRouter } from "@tanstack/react-router"
import { act, cleanup, render, screen, within } from "@testing-library/react"
import { IntlProvider, createTranslator } from "use-intl"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import type { BlogPostSummary } from "~/src/integrations/fumadocs/fumadocs.blog"
import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { Route as SiteRoute } from "~/src/routes/_site"
import { Route as MarketingRoute } from "~/src/routes/_site._marketing"
import { Route as NotFoundRoute } from "~/src/routes/_site._marketing.$"
import { Route as AffiliatesRoute } from "~/src/routes/_site._marketing.affiliates"
import { Route as BlogRoute } from "~/src/routes/_site._marketing.blog"
import { Route as BlogPostRoute } from "~/src/routes/_site._marketing.blog.$"
import { Route as BlogIndexRoute } from "~/src/routes/_site._marketing.blog.index"
import { Route as HomeRoute } from "~/src/routes/_site._marketing.index"
import { Route as LicenceRoute } from "~/src/routes/_site._marketing.licence"
import { Route as PrivacyRoute } from "~/src/routes/_site._marketing.privacy"
import { Route as RefundsRoute } from "~/src/routes/_site._marketing.refunds"
import { Route as TermsRoute } from "~/src/routes/_site._marketing.terms"

import { AFFILIATE_PORTAL_URL, AFFILIATE_PROGRAM, AFFILIATE_TERMS } from "~/src/data/affiliates"
import { BLOG_AUTHOR, BLOG_AUTHORS, BLOG_COVER, BLOG_TAG } from "~/src/data/blog"
import { CLI_GENERATION_VALUES } from "~/src/data/cli"
import { REFUND_TERMS } from "~/src/data/refunds"
import { SIDEBAR_COOKIE } from "~/src/data/sidebar"

import { pageAuthor } from "~/src/lib/blog-seo"
import { starCountQuery } from "~/src/lib/github"
import { REPOSITORY_FACTS } from "~/src/lib/repository-facts"
import { ORGANIZATION_STRUCTURED_DATA_HTML, ROBOTS } from "~/src/lib/seo"

import { DefaultNotFound } from "~/src/presentation/components/custom/default-not-found"

import commonMessages from "~/messages/en-US/common.json"
import componentsNavigationMessages from "~/messages/en-US/components.custom.navigation.json"
import notFoundMessages from "~/messages/en-US/errors.not-found.json"
import pagesBlogMessages from "~/messages/en-US/pages.blog.json"
import pagesLandingMessages from "~/messages/en-US/pages.landing.json"
import pagesLegalAffiliatesMessages from "~/messages/en-US/pages.legal.affiliates.json"
import pagesLegalLicenceMessages from "~/messages/en-US/pages.legal.licence.json"
import pagesLegalPrivacyMessages from "~/messages/en-US/pages.legal.privacy.json"
import pagesLegalRefundsMessages from "~/messages/en-US/pages.legal.refunds.json"
import pagesLegalTermsMessages from "~/messages/en-US/pages.legal.terms.json"
import { CONTACT_EMAIL } from "~/src/presentation/branding"
import type { RouterContext } from "~/src/router"

type BlogPost = (typeof BlogPostRoute.types.loaderData)["post"]

const messages = getTestMessages("en-US")

const PORTAL_HOST = new URL(AFFILIATE_PORTAL_URL).host

const TERMS_VALUES: Record<string, number | string> = {
  ...CLI_GENERATION_VALUES,
  commission: AFFILIATE_TERMS.COMMISSION_PERCENT,
  cookieDays: AFFILIATE_TERMS.COOKIE_DAYS,
  days: REFUND_TERMS.WITHDRAWAL_DAYS,
  email: CONTACT_EMAIL,
  holdDays: AFFILIATE_TERMS.HOLD_DAYS,
  minimumPayout: new Intl.NumberFormat("en-US", {
    currency: AFFILIATE_TERMS.PAYOUT_CURRENCY,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(AFFILIATE_TERMS.MINIMUM_PAYOUT),
  portal: PORTAL_HOST,
  program: AFFILIATE_PROGRAM,
  sidebarDays: SIDEBAR_COOKIE.DAYS,
}

const LEGAL_VALUES = { ...TERMS_VALUES, link: (chunks: string) => chunks, withdrawal: (chunks: string) => chunks }

const legalText = (body: string): string => createTranslator({ locale: "en-US", messages: { body } }).markup("body", LEGAL_VALUES)

const summary = (title: string, slug: string): BlogPostSummary => ({
  date: "2026-09-01",
  image: undefined,
  readingTimeMinutes: 5,
  summary: "Article summary",
  tags: [BLOG_TAG.TANSTACK_START],
  title,
  updated: undefined,
  url: `/blog/${slug}`,
})

const NOTES = [summary("Featured", "featured"), summary("Recent", "recent"), summary("Older", "older")]

const COMPLETE: BlogPost = {
  ...summary("Complete guide", "complete"),
  author: BLOG_AUTHOR.PIOTR_BOROWIECKI,
  description: undefined,
  faq: [{ answer: "Because.", question: "Why?" }],
  image: "/article.webp",
  path: "complete.en-US.mdx",
  related: [],
  toc: [
    { depth: 2, title: "Introduction", url: "#intro" },
    { depth: 3, title: "Step 1 — Deploy", url: "#deploy" },
    { depth: 3, title: "Ship it today", url: "#ship" },
  ],
  updated: undefined,
}

const MINIMAL: BlogPost = {
  ...COMPLETE,
  faq: undefined,
  image: undefined,
  path: "minimal.en-US.mdx",
  summary: undefined,
  tags: [],
  title: "Minimal",
  toc: [],
  url: "/blog/minimal",
}

vi.mock(import("~/src/integrations/use-intl/i18n.messages"), async (original) => ({
  ...(await original()),
  preloadNamespaces: vi.fn(() => Promise.resolve()),
}))
vi.mock("~/src/presentation/components/custom/blog-content", () => ({
  blogContent: { useContent: vi.fn(() => <p>Article content</p>) },
}))

const sectionOf = (heading: HTMLElement): HTMLElement => {
  const container = heading.closest("section")
  if (!container) {
    throw new Error("Missing section")
  }
  return container
}

const STAR_COUNT = 98_765

class TestObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

const routers: ReturnType<typeof createMarketingRouter>[] = []

const createMarketingRouter = ({ path, post, posts }: { path: string; post: BlogPost; posts: BlogPostSummary[] }) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(starCountQuery.queryKey, STAR_COUNT)
  const root = createRootRouteWithContext<RouterContext>()({ component: Outlet })
  Object.assign(SiteRoute.options, { getParentRoute: () => root, id: "_site" })
  Object.assign(MarketingRoute.options, { getParentRoute: () => SiteRoute, id: "_marketing" })
  Object.assign(BlogRoute.options, { getParentRoute: () => MarketingRoute, id: "/blog", path: "/blog" })
  Object.assign(HomeRoute.options, {
    getParentRoute: () => MarketingRoute,
    id: "/",
    loader: (): typeof HomeRoute.types.loaderData => ({
      locale: "en-US",
      metadata: pagesLandingMessages.metadata,
      notes: { latest: posts.slice(1), lead: posts.at(0) },
    }),
    path: "/",
  })
  for (const [route, pathName] of [
    [AffiliatesRoute, "/affiliates"],
    [LicenceRoute, "/licence"],
    [PrivacyRoute, "/privacy"],
    [RefundsRoute, "/refunds"],
    [TermsRoute, "/terms"],
  ] as const) {
    Object.assign(route.options, { getParentRoute: () => MarketingRoute, id: pathName, path: pathName })
  }
  Object.assign(NotFoundRoute.options, { getParentRoute: () => MarketingRoute, id: "/$", path: "/$" })
  Object.assign(BlogIndexRoute.options, {
    getParentRoute: () => BlogRoute,
    id: "/",
    loader: (): typeof BlogIndexRoute.types.loaderData => ({
      featured: [],
      latest: [],
      locale: "en-US",
      metadata: pagesBlogMessages.metadata,
      pages: 1,
      posts,
      updated: [],
    }),
    path: "/",
  })
  Object.assign(BlogPostRoute.options, {
    getParentRoute: () => BlogRoute,
    id: "/$",
    loader: (): typeof BlogPostRoute.types.loaderData => ({
      author: pageAuthor(post.author),
      locale: "en-US",
      post,
      posts: [],
      section: pagesBlogMessages.metadata.title,
    }),
    path: "/$",
  })
  const blog = BlogRoute.addChildren([BlogIndexRoute, BlogPostRoute])
  const marketing = MarketingRoute.addChildren([
    AffiliatesRoute,
    HomeRoute,
    LicenceRoute,
    NotFoundRoute,
    PrivacyRoute,
    RefundsRoute,
    TermsRoute,
    blog,
  ])
  return createRouter({
    context: { queryClient },
    defaultNotFoundComponent: DefaultNotFound,
    defaultPendingMinMs: 0,
    history: createMemoryHistory({ initialEntries: [path] }),
    routeTree: root.addChildren([SiteRoute.addChildren([marketing])]),
  })
}

const renderRoute = async (path: string, { post = COMPLETE, posts = NOTES }: { post?: BlogPost; posts?: BlogPostSummary[] } = {}) => {
  const router = createMarketingRouter({ path, post, posts })
  routers.push(router)
  render(
    <QueryClientProvider client={router.options.context.queryClient}>
      <IntlProvider formats={I18N.FORMATS} locale="en-US" messages={messages} timeZone={I18N.DEFAULT_TIMEZONE}>
        <RouterProvider router={router} />
      </IntlProvider>
    </QueryClientProvider>,
  )
  await act(() => router.load())
  return router
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal("IntersectionObserver", TestObserver)
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
  vi.stubGlobal("ResizeObserver", TestObserver)
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
    { copy: pagesLegalAffiliatesMessages, document: "affiliates" },
  ])("loads and renders the complete $document document", async ({ copy, document }) => {
    const router = await renderRoute(`/${document}`)
    expect(screen.getByRole("heading", { name: copy.title })).toBeVisible()
    const sections: Record<string, { title: string; body: string }> = copy.sections
    for (const section of Object.values(sections)) {
      const heading = screen.getByRole("heading", { name: section.title })
      expect(heading).toBeVisible()
      expect(heading.nextElementSibling?.textContent).toBe(legalText(section.body))
    }
    expect(router.state.matches.at(-1)?.loaderData).toMatchObject({ locale: "en-US", metadata: copy.metadata })
    expect(router.state.matches.at(-1)?.status).toBe("success")
  })

  it("answers an unknown path with the not-found page between the site header and footer, kept out of search results", async () => {
    const router = await renderRoute("/no/such/page")

    expect(screen.getByRole("heading", { level: 1, name: notFoundMessages.metadata.title })).toBeVisible()
    expect(screen.getByText(notFoundMessages.metadata.description)).toBeVisible()
    expect(screen.getByRole("link", { name: commonMessages.backHome })).toHaveAttribute("href", "/")
    expect(screen.getByRole("navigation", { name: componentsNavigationMessages.ariaLabel })).toBeVisible()
    expect(screen.getByRole("contentinfo")).toBeVisible()
    const notFoundMatch = router.state.matches.at(-1)
    expect(notFoundMatch?.routeId).toBe(NotFoundRoute.id)
    expect(notFoundMatch?.status).toBe("notFound")
    expect(notFoundMatch?.meta).toContainEqual({ content: ROBOTS.NOINDEX, name: "robots" })
  })

  it.each(["/terms", "/blog", "/no/such/page"])("starts %s below the fixed site header", async (path) => {
    await renderRoute(path)
    expect(screen.getByRole("main")).toHaveClass("pt-header")
  })

  it("lets the landing page draw its hero under the site header", async () => {
    await renderRoute("/")
    expect(screen.getByRole("main")).not.toHaveClass("pt-header")
  })

  it("renders the landing page with cached stars, installation controls and public navigation", async () => {
    await renderRoute("/")
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(`${String(REPOSITORY_FACTS.headStartHours)}+ hour head start`)
    expect(screen.getByText(new Intl.NumberFormat("en-US").format(STAR_COUNT), { selector: "dd" })).toBeVisible()
    expect(screen.getAllByRole("radio", { name: "bun" })).toHaveLength(2)
    expect(screen.getByRole("contentinfo")).toBeVisible()
    expect(screen.getByRole("navigation", { name: componentsNavigationMessages.ariaLabel })).toBeVisible()
  })

  it("describes the organisation in the landing page's structured data", async () => {
    const { __html: html } = ORGANIZATION_STRUCTURED_DATA_HTML
    await renderRoute("/")
    expect(document.querySelector('script[type="application/ld+json"]')?.innerHTML).toBe(html)
  })

  it("leads the notes with the featured post and its cover, then lists the latest posts in the order the server selected them", async () => {
    await renderRoute("/", { posts: [{ ...summary("Featured", "featured"), image: "/images/blog/featured.webp" }, ...NOTES.slice(1)] })
    const notes = sectionOf(screen.getByRole("heading", { level: 2, name: pagesLandingMessages.notes.title }))
    expect(within(notes).getByRole("heading", { level: 3, name: "Featured" })).toBeVisible()
    expect(within(notes).getByRole("link", { name: "Featured" })).toHaveAttribute("href", "/blog/featured")
    expect(notes.querySelector('img[src="/images/blog/featured.webp"]')).toHaveAttribute("loading", "lazy")
    expect(within(notes).getByRole("heading", { level: 3, name: pagesLandingMessages.notes.latest })).toBeVisible()
    expect(
      within(notes)
        .getAllByRole("heading", { level: 4 })
        .map((heading) => heading.textContent),
    ).toEqual(["Recent", "Older"])
    expect(within(notes).getAllByText(/5 min read/u)).toHaveLength(3)
    expect(within(notes).getByRole("link", { name: pagesLandingMessages.notes.cta })).toHaveAttribute("href", "/blog")
  })

  it("keeps the notes without a lead post or summaries", async () => {
    await renderRoute("/", { posts: [] })
    const notes = sectionOf(screen.getByRole("heading", { level: 2, name: pagesLandingMessages.notes.title }))
    expect(within(notes).queryByRole("heading", { level: 4 })).toBeNull()
    expect(notes.querySelector("[data-slot=post-cover]")).toBeNull()
    expect(within(notes).getByRole("link", { name: pagesLandingMessages.notes.cta })).toHaveAttribute("href", "/blog")
  })

  it("draws a cover for a lead post without an image and leaves out missing summaries", async () => {
    await renderRoute("/", {
      posts: [
        { ...summary("Lead", "lead"), summary: undefined },
        { ...summary("Plain", "plain"), summary: undefined },
      ],
    })
    const notes = sectionOf(screen.getByRole("heading", { level: 2, name: pagesLandingMessages.notes.title }))
    expect(notes.querySelector("[data-slot=post-cover]")).toHaveAttribute("aria-hidden", "true")
    expect(within(notes).queryByText("Article summary")).toBeNull()
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
        .getAllByRole("heading", { level: 3 })
        .map((heading) => heading.textContent)
        .filter((title) => titles.has(title)),
    ).toEqual(["Featured", "Recent", "Older"])
  })

  it("renders an article with its metadata, hero image, structured data and table of contents", async () => {
    await renderRoute("/blog/complete")
    expect(screen.getByRole("heading", { name: "Complete guide" })).toBeVisible()
    expect(screen.getByText("Article content")).toBeVisible()
    expect(screen.getByText("Article summary")).toBeVisible()
    expect(screen.getAllByText(BLOG_AUTHORS[BLOG_AUTHOR.PIOTR_BOROWIECKI].name)).toHaveLength(2)
    expect(document.querySelector('img[src="/article.webp"]')).toHaveAttribute("width", String(BLOG_COVER.WIDTH))
    expect(screen.getAllByRole("link", { name: "Introduction" }).every((link) => link.getAttribute("href") === "#intro")).toBe(true)
    expect(screen.getAllByRole("link", { name: "Step 1 — Deploy" }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole("link", { name: "Ship it today" }).every((link) => link.getAttribute("href") === "#ship")).toBe(true)
    expect(document.querySelector('img[src="/article.webp"]')).toHaveAttribute("fetchpriority", "high")
    expect(document.querySelector('script[type="application/ld+json"]')).toHaveTextContent("FAQPage")
  })

  it("renders a minimal article without empty summary, image or tags", async () => {
    await renderRoute("/blog/minimal", { post: MINIMAL })
    expect(screen.getByRole("heading", { name: "Minimal" })).toBeVisible()
    expect(screen.queryByText("Article summary")).not.toBeInTheDocument()
    expect(document.querySelector('img[src=""]')).not.toBeInTheDocument()
  })
})
