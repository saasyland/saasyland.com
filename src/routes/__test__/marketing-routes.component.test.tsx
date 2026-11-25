import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  type AnyRoute,
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRouteWithContext,
  createRouter,
} from "@tanstack/react-router"
import { act, cleanup, render, screen, within } from "@testing-library/react"
import { IntlProvider, createTranslator } from "use-intl"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { NOTES, landingNotes, noteSummary } from "~/src/routes/__test__/fixtures/blog-notes"
import { Route as SiteRoute } from "~/src/routes/_site"
import { Route as MarketingRoute } from "~/src/routes/_site._marketing"
import { Route as NotFoundRoute } from "~/src/routes/_site._marketing.$"
import { Route as AffiliatesRoute } from "~/src/routes/_site._marketing.affiliates"
import { Route as HomeRoute } from "~/src/routes/_site._marketing.index"
import { Route as LicenceRoute } from "~/src/routes/_site._marketing.licence"
import { Route as PrivacyRoute } from "~/src/routes/_site._marketing.privacy"
import { Route as RefundsRoute } from "~/src/routes/_site._marketing.refunds"
import { Route as TermsRoute } from "~/src/routes/_site._marketing.terms"

import { AFFILIATE_PORTAL_URL, AFFILIATE_PROGRAM, AFFILIATE_TERMS } from "~/src/data/affiliates"
import { CLI_GENERATION_VALUES } from "~/src/data/cli"
import { REFUND_TERMS } from "~/src/data/refunds"
import { SIDEBAR_COOKIE } from "~/src/data/sidebar"

import { starCountQuery } from "~/src/lib/github"
import { ORGANIZATION_STRUCTURED_DATA_HTML, ROBOTS } from "~/src/lib/seo"

import { DefaultNotFound } from "~/src/presentation/components/custom/default-not-found"

import commonMessages from "~/messages/en-US/common.json"
import componentsNavigationMessages from "~/messages/en-US/components.custom.navigation.json"
import notFoundMessages from "~/messages/en-US/errors.not-found.json"
import pagesLandingMessages from "~/messages/en-US/pages.landing.json"
import landingNotesMessages from "~/messages/en-US/pages.landing.notes.json"
import pagesLegalAffiliatesMessages from "~/messages/en-US/pages.legal.affiliates.json"
import pagesLegalLicenceMessages from "~/messages/en-US/pages.legal.licence.json"
import pagesLegalPrivacyMessages from "~/messages/en-US/pages.legal.privacy.json"
import pagesLegalRefundsMessages from "~/messages/en-US/pages.legal.refunds.json"
import pagesLegalTermsMessages from "~/messages/en-US/pages.legal.terms.json"
import { CONTACT_EMAIL } from "~/src/presentation/branding"
import type { RouterContext } from "~/src/router"
import * as ROUTES from "~/src/routes"

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

vi.mock(import("~/src/integrations/use-intl/i18n.messages"), async (original) => ({
  ...(await original()),
  preloadNamespaces: vi.fn(() => Promise.resolve()),
}))

const sectionOf = (heading: HTMLElement): HTMLElement => {
  const container = heading.closest("section")
  if (!container) {
    throw new Error("Missing section")
  }
  return container
}

const STAR_COUNT = 98_765

const QUERY_SEEDS: readonly ((queryClient: QueryClient) => void)[] = [
  (queryClient) => {
    queryClient.setQueryData(starCountQuery.queryKey, STAR_COUNT)
  },
]

interface DocumentRoute {
  readonly path: string
  readonly route: AnyRoute
}

const DOCUMENT_ROUTES: readonly DocumentRoute[] = [
  { path: ROUTES.AFFILIATES, route: AffiliatesRoute },
  { path: ROUTES.LICENCE, route: LicenceRoute },
  { path: ROUTES.PRIVACY, route: PrivacyRoute },
  { path: ROUTES.REFUNDS, route: RefundsRoute },
  { path: ROUTES.TERMS, route: TermsRoute },
]

type HomeData = typeof HomeRoute.types.loaderData

class TestObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

const routers: ReturnType<typeof createMarketingRouter>[] = []

const createMarketingRouter = (path: string, home: Partial<HomeData>) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  for (const seed of QUERY_SEEDS) {
    seed(queryClient)
  }
  const root = createRootRouteWithContext<RouterContext>()({ component: Outlet })
  Object.assign(SiteRoute.options, { getParentRoute: () => root, id: "_site" })
  Object.assign(MarketingRoute.options, { getParentRoute: () => SiteRoute, id: "_marketing" })
  Object.assign(HomeRoute.options, {
    getParentRoute: () => MarketingRoute,
    id: "/",
    loader: (): HomeData => ({
      locale: "en-US",
      metadata: pagesLandingMessages.metadata,
      notes: landingNotes(NOTES),
      ...home,
    }),
    path: "/",
  })
  for (const { path: routePath, route } of DOCUMENT_ROUTES) {
    Object.assign(route.options, { getParentRoute: () => MarketingRoute, id: routePath, path: routePath })
  }
  Object.assign(NotFoundRoute.options, { getParentRoute: () => MarketingRoute, id: "/$", path: "/$" })
  const marketing = MarketingRoute.addChildren([
    AffiliatesRoute,
    HomeRoute,
    LicenceRoute,
    NotFoundRoute,
    PrivacyRoute,
    RefundsRoute,
    TermsRoute,
  ])
  return createRouter({
    context: { queryClient },
    defaultNotFoundComponent: DefaultNotFound,
    defaultPendingMinMs: 0,
    history: createMemoryHistory({ initialEntries: [path] }),
    routeTree: root.addChildren([SiteRoute.addChildren([marketing])]),
  })
}

const renderRoute = async (path: string, home: Partial<HomeData> = {}) => {
  const router = createMarketingRouter(path, home)
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

  it.each([ROUTES.TERMS, "/no/such/page"])("starts %s below the fixed site header", async (path) => {
    await renderRoute(path)
    expect(screen.getByRole("main")).toHaveClass("pt-header")
  })

  it("lets the landing page draw its hero under the site header", async () => {
    await renderRoute("/")
    expect(screen.getByRole("main")).not.toHaveClass("pt-header")
  })

  it("renders the landing page with cached stars, installation controls and public navigation", async () => {
    await renderRoute("/")
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      createTranslator({ locale: "en-US", messages: pagesLandingMessages.hero }).markup("title", { accent: (chunks: string) => chunks }),
    )
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
    await renderRoute("/", {
      notes: landingNotes([{ ...noteSummary("Featured", "featured"), image: "/images/blog/featured.webp" }, ...NOTES.slice(1)]),
    })
    const notes = sectionOf(screen.getByRole("heading", { level: 2, name: landingNotesMessages.title }))
    expect(within(notes).getByRole("heading", { level: 3, name: "Featured" })).toBeVisible()
    expect(within(notes).getByRole("link", { name: "Featured" })).toHaveAttribute("href", "/blog/featured")
    expect(notes.querySelector('img[src="/images/blog/featured.webp"]')).toHaveAttribute("loading", "lazy")
    expect(within(notes).getByRole("heading", { level: 3, name: landingNotesMessages.latest })).toBeVisible()
    expect(
      within(notes)
        .getAllByRole("heading", { level: 4 })
        .map((heading) => heading.textContent),
    ).toEqual(["Recent", "Older"])
    expect(within(notes).getAllByText(/5 min read/u)).toHaveLength(3)
    expect(within(notes).getByRole("link", { name: landingNotesMessages.cta })).toHaveAttribute("href", "/blog")
  })

  it("keeps the notes without a lead post or summaries", async () => {
    await renderRoute("/", { notes: landingNotes([]) })
    const notes = sectionOf(screen.getByRole("heading", { level: 2, name: landingNotesMessages.title }))
    expect(within(notes).queryByRole("heading", { level: 4 })).toBeNull()
    expect(notes.querySelector("[data-slot=post-cover]")).toBeNull()
    expect(within(notes).getByRole("link", { name: landingNotesMessages.cta })).toHaveAttribute("href", "/blog")
  })

  it("draws a cover for a lead post without an image and leaves out missing summaries", async () => {
    await renderRoute("/", {
      notes: landingNotes([
        { ...noteSummary("Lead", "lead"), summary: undefined },
        { ...noteSummary("Plain", "plain"), summary: undefined },
      ]),
    })
    const notes = sectionOf(screen.getByRole("heading", { level: 2, name: landingNotesMessages.title }))
    expect(notes.querySelector("[data-slot=post-cover]")).toHaveAttribute("aria-hidden", "true")
    expect(within(notes).queryByText("Article summary")).toBeNull()
  })
})
