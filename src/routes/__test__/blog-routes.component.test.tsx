import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Outlet, RouterProvider, createMemoryHistory, createRootRouteWithContext, createRouter } from "@tanstack/react-router"
import { getRequest } from "@tanstack/react-start/server"
import { act, cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { IntlProvider } from "use-intl"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { type BlogPostSummary, getPublishedBlogPosts } from "~/src/integrations/fumadocs/fumadocs.source"
import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"
import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { deLocalizeUrl, localizeUrl } from "~/src/integrations/use-intl/i18n.utils"

import { Route as BlogRoute } from "~/src/routes/blog"
import { Route as BlogPostRoute } from "~/src/routes/blog.$"
import { Route as BlogIndexRoute } from "~/src/routes/blog.index"

import pagesBlogMessages from "~/messages/en-US/pages.blog.json"
import plPagesBlogMessages from "~/messages/pl-PL/pages.blog.json"
import { APP_URL } from "~/src/presentation/branding"
import type { RouterContext } from "~/src/router"

const SHARED_TITLE = "React & SaaS / launch"

const { blog } = vi.hoisted(() => {
  const base = {
    authorName: "Ada",
    date: "2026-09-01",
    published: true,
    structuredData: { contents: [{ content: "word ".repeat(10), heading: undefined }], headings: [] },
    tags: [],
    toc: [],
  }
  return {
    blog: [
      {
        ...base,
        description: "Article summary",
        info: { fullPath: "/content/blog/guide.en-US.mdx", path: "guide.en-US.mdx" },
        structuredData: { contents: [{ content: "word ".repeat(1100), heading: undefined }], headings: [] },
        tags: ["React", "SaaS"],
        title: "React & SaaS / launch",
        toc: [
          { depth: 2, title: "Start", url: "#start" },
          { depth: 3, title: "Detail", url: "#detail" },
        ],
      },
      {
        ...base,
        date: "2024-01-01",
        info: { fullPath: "/content/blog/minimal.en-US.mdx", path: "minimal.en-US.mdx" },
        title: "Minimal",
      },
      {
        ...base,
        info: { fullPath: "/content/blog/guide.pl-PL.mdx", path: "guide.pl-PL.mdx" },
        title: "Przewodnik",
      },
    ],
  }
})

vi.mock("collections/server", () => ({ blog, docs: { toFumadocsSource: () => ({ files: [] }) } }))
vi.mock(import("~/src/integrations/fumadocs/fumadocs.source"), async (original) => {
  const actual = await original()
  return { ...actual, getPublishedBlogPosts: vi.fn(actual.getPublishedBlogPosts) }
})
vi.mock("~/src/presentation/components/custom/blog-content", () => ({
  blogContent: { preload: vi.fn(() => Promise.resolve()), useContent: vi.fn(() => <p>Article content</p>) },
}))

const routers: ReturnType<typeof createBlogRouter>[] = []

const createBlogRouter = (path: string) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const root = createRootRouteWithContext<RouterContext>()({ component: Outlet })
  Object.assign(BlogRoute.options, { getParentRoute: () => root, id: "/blog", path: "/blog" })
  Object.assign(BlogIndexRoute.options, { getParentRoute: () => BlogRoute, id: "/", path: "/" })
  Object.assign(BlogPostRoute.options, { getParentRoute: () => BlogRoute, id: "/$", path: "/$" })
  return createRouter({
    context: { queryClient },
    defaultPendingMinMs: 0,
    history: createMemoryHistory({ initialEntries: [path] }),
    rewrite: { input: ({ url }) => deLocalizeUrl(url), output: ({ url }) => localizeUrl(url) },
    routeTree: root.addChildren([BlogRoute.addChildren([BlogIndexRoute, BlogPostRoute])]),
  })
}

const renderBlog = async ({ locale, path }: { locale: SupportedLocale; path: string }) => {
  vi.mocked(getRequest).mockReturnValue(new Request(`http://127.0.0.1:3000${path}`))
  const router = createBlogRouter(path)
  routers.push(router)
  render(
    <QueryClientProvider client={router.options.context.queryClient}>
      <IntlProvider locale={locale} messages={getTestMessages(locale)} timeZone="UTC">
        <RouterProvider router={router} />
      </IntlProvider>
    </QueryClientProvider>,
  )
  await act(() => router.load())
  return router
}

const section = (element: HTMLElement, selector: "aside" | "section"): HTMLElement => {
  const container = element.closest(selector)
  if (!container) {
    throw new Error(`Missing ${selector}`)
  }
  return container
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
  vi.stubGlobal("scrollTo", vi.fn())
})

afterEach(() => {
  cleanup()
  for (const router of routers) {
    router.options.context.queryClient.clear()
  }
  routers.length = 0
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("blog routes", () => {
  it("keeps the blog navigation current and localizes the pricing and docs links", async () => {
    await renderBlog({ locale: "pl-PL", path: "/pl-PL/blog/guide" })
    const nav = within(screen.getByRole("navigation", { name: plPagesBlogMessages.metadata.title }))
    expect(nav.getByRole("link", { name: plPagesBlogMessages.nav.blog })).toHaveAttribute("aria-current", "page")
    expect(nav.getByRole("link", { name: plPagesBlogMessages.nav.docs })).toHaveAttribute("href", "/pl-PL/docs")
    expect(nav.getByRole("link", { name: plPagesBlogMessages.nav.getStarted })).toHaveAttribute("href", "/pl-PL#pricing")
    expect(screen.getByRole("link", { name: plPagesBlogMessages.post.cta.primary })).toHaveAttribute("href", "/pl-PL#pricing")
    expect(screen.getByRole("link", { name: plPagesBlogMessages.post.cta.secondary })).toHaveAttribute("href", "/pl-PL/docs")
  })

  it("loads the post in the page's locale when the server function request carries another locale's cookie", async () => {
    const { loader } = BlogPostRoute.options
    if (typeof loader !== "function") {
      throw new TypeError("Blog posts must have a loader")
    }
    const capture = vi.fn(loader)
    BlogPostRoute.options.loader = capture
    await renderBlog({ locale: "pl-PL", path: "/pl-PL/blog/guide" })
    BlogPostRoute.options.loader = loader
    const input = capture.mock.calls[0]?.[0]
    if (!input) {
      throw new Error("Blog loader was not called")
    }
    vi.mocked(getRequest)
      .mockReturnValueOnce(new Request("http://127.0.0.1:3000/pl-PL/blog/guide"))
      .mockReturnValue(new Request("http://127.0.0.1:3000/_serverFn/blog-post", { headers: { cookie: `${I18N.COOKIE_NAME}=en-US` } }))
    await expect(loader(input)).resolves.toMatchObject({ locale: "pl-PL", post: { title: "Przewodnik" } })
  })

  it("encodes sharing targets and copies the canonical URL", async () => {
    const user = userEvent.setup()
    await renderBlog({ locale: "en-US", path: "/blog/guide" })
    const url = `${APP_URL}/blog/guide`
    const shareOnX = screen.getByRole("link", { name: pagesBlogMessages.post.share.x })
    expect(new URL(shareOnX.getAttribute("href") ?? "").searchParams.get("text")).toBe(SHARED_TITLE)
    expect(new URL(shareOnX.getAttribute("href") ?? "").searchParams.get("url")).toBe(url)
    expect(shareOnX).toHaveAttribute("rel", "noopener noreferrer")
    const linkedIn = screen.getByRole("link", { name: pagesBlogMessages.post.share.linkedin })
    expect(new URL(linkedIn.getAttribute("href") ?? "").searchParams.get("url")).toBe(url)
    await user.click(screen.getByRole("button", { name: pagesBlogMessages.post.share.copy }))
    expect(await navigator.clipboard.readText()).toBe(url)
  })

  it("links table-of-contents entries and distinguishes nested headings", async () => {
    await renderBlog({ locale: "en-US", path: "/blog/guide" })
    const toc = within(section(screen.getByText(pagesBlogMessages.post.contents), "aside"))
    expect(toc.getByRole("link", { name: "Start" })).toHaveAttribute("href", "#start")
    expect(toc.getByRole("link", { name: "Start" })).toHaveClass("pl-4")
    expect(toc.getByRole("link", { name: "Detail" })).toHaveClass("pl-7")
  })

  it("renders summaries, tags and reading times without empty placeholders", async () => {
    await renderBlog({ locale: "en-US", path: "/blog" })
    const ledger = within(section(screen.getByRole("heading", { level: 1, name: pagesBlogMessages.index.title }), "section"))
    expect(ledger.getByText("Article summary")).toBeVisible()
    expect(ledger.getByText("React · SaaS")).toBeVisible()
    expect(ledger.getByText("5 min read")).toBeVisible()
    expect(ledger.getAllByText(/·/u)).toHaveLength(1)
    expect(ledger.getByRole("link", { name: "Minimal" })).toHaveAttribute("href", "/blog/minimal")
  })

  it.each([
    { label: "14 min de lecture", locale: "fr-FR" as const },
    { label: "Час читання: 14 хв", locale: "uk-UA" as const },
  ])("preserves the server reading time when browser word segmentation differs in $locale", async ({ label, locale }) => {
    const post: BlogPostSummary = {
      date: "2026-09-01",
      featured: false,
      readingTimeMinutes: 14,
      summary: "A post with a reading time calculated by the server.",
      tags: [],
      title: "Server-provided reading time",
      url: `/${locale}/blog/post`,
    }
    vi.mocked(getPublishedBlogPosts).mockReturnValueOnce([post])
    const browserWords = new Intl.Segmenter(locale, { granularity: "word" }).segment("one")
    const segment = vi.spyOn(Intl.Segmenter.prototype, "segment").mockReturnValue(browserWords)
    await renderBlog({ locale, path: `/${locale}/blog` })
    expect(screen.getByText(label)).toBeVisible()
    expect(segment).not.toHaveBeenCalled()
  })
})
