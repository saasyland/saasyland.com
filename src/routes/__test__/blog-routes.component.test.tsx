import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Outlet, RouterProvider, createMemoryHistory, createRootRouteWithContext, createRouter } from "@tanstack/react-router"
import { getRequest } from "@tanstack/react-start/server"
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { IntlProvider, createTranslator } from "use-intl"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { getHeaderHref } from "~/src/platform/testing/lib/navigation"

import type { BlogPostSummary } from "~/src/integrations/fumadocs/fumadocs.blog"
import { getNavigationLabel, getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"
import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { deLocalizeUrl, localizeUrl } from "~/src/integrations/use-intl/i18n.utils"

import { Route as SiteRoute } from "~/src/routes/_site"
import { Route as MarketingRoute } from "~/src/routes/_site._marketing"
import { Route as BlogRoute } from "~/src/routes/_site._marketing.blog"
import { Route as BlogPostRoute } from "~/src/routes/_site._marketing.blog.$"
import { Route as BlogIndexRoute } from "~/src/routes/_site._marketing.blog.index"

import { BLOG_TAG } from "~/src/data/blog"
import { CLI_GENERATION_VALUES } from "~/src/data/cli"
import { HEADER_NAVIGATION } from "~/src/data/navigation"
import { REPOSITORY_FACTS } from "~/src/data/repository-facts"

import pagesBlogMessages from "~/messages/en-US/pages.blog.json"
import plNavigationMessages from "~/messages/pl-PL/components.custom.navigation.json"
import plContentNavigationMessages from "~/messages/pl-PL/navigation.content.json"
import plPagesBlogMessages from "~/messages/pl-PL/pages.blog.json"
import { APP_URL } from "~/src/presentation/branding"
import type { RouterContext } from "~/src/router"

type BlogPost = (typeof BlogPostRoute.types.loaderData)["post"]

const SHARED_TITLE = "React & SaaS / launch"

const RELATED: BlogPostSummary = {
  date: "2026-08-15",
  featured: false,
  readingTimeMinutes: 9,
  summary: "Related summary",
  tags: [BLOG_TAG.SAAS],
  title: "Related guide",
  url: "/blog/related",
}

const GUIDE: BlogPost = {
  authorImage: "/images/blog/authors/ada.webp",
  authorName: "Ada",
  authorUrl: "https://github.com/ada",
  date: "2026-09-01",
  description: "Article description",
  faq: undefined,
  featured: false,
  image: undefined,
  path: "guide.en-US.mdx",
  readingTimeMinutes: 5,
  related: [RELATED],
  summary: "Article summary",
  tags: [BLOG_TAG.TANSTACK_START, BLOG_TAG.SAAS],
  title: SHARED_TITLE,
  toc: [
    { depth: 2, title: "Start", url: "#start" },
    { depth: 3, title: "Detail", url: "#detail" },
  ],
  updated: undefined,
  url: "/blog/guide",
}

const POLISH_GUIDE: BlogPost = {
  ...GUIDE,
  authorImage: undefined,
  authorUrl: undefined,
  path: "guide.pl-PL.mdx",
  related: [],
  summary: undefined,
  tags: [BLOG_TAG.TESTING, BLOG_TAG.TOOLING],
  title: "Przewodnik",
  toc: [{ depth: 2, title: "Start", url: "#start" }],
  url: "/pl-PL/blog/guide",
}

const MINIMAL: BlogPostSummary = {
  date: "2024-01-01",
  featured: false,
  readingTimeMinutes: 1,
  summary: undefined,
  tags: [],
  title: "Minimal",
  url: "/blog/minimal",
}

vi.mock("~/src/presentation/components/custom/blog-content", () => ({
  blogContent: { useContent: vi.fn(() => <p>Article content</p>) },
}))

const routers: ReturnType<typeof createBlogRouter>[] = []

const createBlogRouter = ({
  locale,
  path,
  post,
  posts,
}: {
  locale: SupportedLocale
  path: string
  post: BlogPost
  posts: BlogPostSummary[]
}) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const root = createRootRouteWithContext<RouterContext>()({ component: Outlet })
  Object.assign(SiteRoute.options, { getParentRoute: () => root, id: "_site" })
  Object.assign(MarketingRoute.options, { getParentRoute: () => SiteRoute, id: "_marketing" })
  Object.assign(BlogRoute.options, { getParentRoute: () => MarketingRoute, id: "/blog", path: "/blog" })
  Object.assign(BlogIndexRoute.options, {
    getParentRoute: () => BlogRoute,
    id: "/",
    loader: (): typeof BlogIndexRoute.types.loaderData => ({ locale, metadata: pagesBlogMessages.metadata, posts }),
    path: "/",
  })
  Object.assign(BlogPostRoute.options, {
    getParentRoute: () => BlogRoute,
    id: "/$",
    loader: (): typeof BlogPostRoute.types.loaderData => ({ locale, post, section: pagesBlogMessages.metadata.title }),
    path: "/$",
  })
  const blog = BlogRoute.addChildren([BlogIndexRoute, BlogPostRoute])
  const site = SiteRoute.addChildren([MarketingRoute.addChildren([blog])])
  return createRouter({
    context: { queryClient },
    defaultPendingMinMs: 0,
    history: createMemoryHistory({ initialEntries: [path] }),
    rewrite: { input: ({ url }) => deLocalizeUrl(url), output: ({ url }) => localizeUrl(url) },
    routeTree: root.addChildren([site]),
  })
}

const renderBlog = async ({
  locale,
  path,
  post = GUIDE,
  posts = [],
}: {
  locale: SupportedLocale
  path: string
  post?: BlogPost
  posts?: BlogPostSummary[]
}) => {
  vi.mocked(getRequest).mockReturnValue(new Request(`http://127.0.0.1:3000${path}`))
  const router = createBlogRouter({ locale, path, post, posts })
  routers.push(router)
  render(
    <QueryClientProvider client={router.options.context.queryClient}>
      <IntlProvider formats={I18N.FORMATS} locale={locale} messages={getTestMessages(locale)} timeZone={I18N.DEFAULT_TIMEZONE}>
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
  vi.stubGlobal("CSS", { supports: () => true })
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
  it("keeps the blog navigation current and localizes the pricing and page links", async () => {
    await renderBlog({ locale: "pl-PL", path: "/pl-PL/blog/guide", post: POLISH_GUIDE })
    const nav = within(screen.getByRole("navigation", { name: plNavigationMessages.ariaLabel }))
    const pageLabel = getNavigationLabel("pl-PL")
    expect(nav.getByRole("link", { current: "page" })).toHaveAccessibleName(plContentNavigationMessages.header.blog)
    const headerHref = getHeaderHref("pl-PL")
    for (const entry of HEADER_NAVIGATION) {
      expect(nav.getByRole("link", { name: pageLabel(entry) })).toHaveAttribute("href", headerHref(entry))
    }
    expect(nav.getByRole("link", { name: plNavigationMessages.getStarted })).toHaveAttribute("href", "/pl-PL#pricing")
    expect(screen.getByRole("link", { name: plPagesBlogMessages.post.cta.primary })).toHaveAttribute("href", "/pl-PL#pricing")
    expect(screen.getByRole("link", { name: plPagesBlogMessages.post.cta.secondary })).toHaveAttribute("href", "/pl-PL/docs")
    const ctaBody = createTranslator({ locale: "pl-PL", messages: plPagesBlogMessages.post.cta })("body", {
      ...REPOSITORY_FACTS,
      ...CLI_GENERATION_VALUES,
    })
    expect(screen.getByText(ctaBody)).toBeVisible()
  })

  it("links table-of-contents entries and distinguishes nested headings", async () => {
    await renderBlog({ locale: "en-US", path: "/blog/guide" })
    const toc = within(section(screen.getByText(pagesBlogMessages.post.contents, { selector: "aside p" }), "aside"))
    expect(toc.getByRole("link", { name: "Start" })).toHaveAttribute("href", "#start")
    expect(toc.getByRole("link", { name: "Start" })).toHaveClass("pl-4")
    expect(toc.getByRole("link", { name: "Detail" })).toHaveClass("pl-7")
  })

  it("names a post's tags and its table of contents in the post's language", async () => {
    await renderBlog({ locale: "pl-PL", path: "/pl-PL/blog/guide", post: POLISH_GUIDE })
    expect(screen.getByText(`${plPagesBlogMessages.tags[BLOG_TAG.TESTING]}, ${plPagesBlogMessages.tags[BLOG_TAG.TOOLING]}`)).toBeVisible()
    expect(screen.getByRole("button", { name: plPagesBlogMessages.post.contents })).toBeInTheDocument()
  })

  it("shows only the publication date of a post that was never updated", async () => {
    await renderBlog({ locale: "en-US", path: "/blog/guide" })
    const published = screen.getByText("September 1, 2026", { selector: "time" })
    expect(published).toHaveAttribute("datetime", "2026-09-01T00:00:00.000Z")
    expect(published.parentElement).toHaveTextContent(/^Published September 1, 2026$/u)
    expect(screen.queryByText(/^Updated /u)).not.toBeInTheDocument()
    expect(document.querySelectorAll("article time")).toHaveLength(1)
  })

  it("leaves the update out when the post was updated on the day it was published", async () => {
    await renderBlog({ locale: "en-US", path: "/blog/guide", post: { ...GUIDE, updated: GUIDE.date } })
    expect(document.querySelectorAll("article time")).toHaveLength(1)
  })

  it.each([
    { locale: "en-US" as const, post: GUIDE, published: "Published September 1, 2026", updated: "Updated November 17, 2026" },
    {
      locale: "pl-PL" as const,
      post: POLISH_GUIDE,
      published: "Opublikowano 1 września 2026",
      updated: "Zaktualizowano 17 listopada 2026",
    },
  ])(
    "shows when a $locale post was published and when it was updated, each in its own time element",
    async ({ locale, post, ...labels }) => {
      await renderBlog({ locale, path: post.url, post: { ...post, updated: "2026-11-17" } })
      const times = Array.from(document.querySelectorAll("article time"), (time) => ({
        dateTime: time.getAttribute("datetime"),
        label: time.parentElement?.textContent,
      }))
      expect(times).toStrictEqual([
        { dateTime: "2026-09-01T00:00:00.000Z", label: labels.published },
        { dateTime: "2026-11-17T00:00:00.000Z", label: labels.updated },
      ])
    },
  )

  it("renders summaries, tags and reading times without empty placeholders", async () => {
    await renderBlog({ locale: "en-US", path: "/blog", posts: [GUIDE, MINIMAL] })
    const ledger = within(section(screen.getByRole("heading", { level: 1, name: pagesBlogMessages.index.title }), "section"))
    expect(ledger.getByText("Article summary")).toBeVisible()
    expect(ledger.getByText(`${pagesBlogMessages.tags[BLOG_TAG.TANSTACK_START]} · ${pagesBlogMessages.tags[BLOG_TAG.SAAS]}`)).toBeVisible()
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
    const browserWords = new Intl.Segmenter(locale, { granularity: "word" }).segment("one")
    const segment = vi.spyOn(Intl.Segmenter.prototype, "segment").mockReturnValue(browserWords)
    await renderBlog({ locale, path: `/${locale}/blog`, posts: [post] })
    expect(screen.getByText(label)).toBeVisible()
    expect(segment).not.toHaveBeenCalled()
  })
})

describe("the end of a blog post and its metadata", () => {
  it("closes the article with its author, linked to the author's profile", async () => {
    await renderBlog({ locale: "en-US", path: "/blog/guide" })
    const author = screen.getByRole("link", { name: "Ada" })
    expect(author).toHaveAttribute("href", "https://github.com/ada")
    expect(author).toHaveAttribute("rel", "author noopener noreferrer")
    expect(screen.getByText(pagesBlogMessages.post.author.label)).toBeVisible()
    expect(document.querySelector('img[src="/images/blog/authors/ada.webp"]')).toHaveAttribute("loading", "lazy")
  })

  it("names an author without a profile or image as text", async () => {
    await renderBlog({ locale: "pl-PL", path: "/pl-PL/blog/guide", post: POLISH_GUIDE })
    expect(screen.queryByRole("link", { name: "Ada" })).not.toBeInTheDocument()
    expect(screen.getByText(plPagesBlogMessages.post.author.label)).toBeVisible()
    expect(document.querySelector('img[src^="/images/blog/authors"]')).not.toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: plPagesBlogMessages.post.related })).not.toBeInTheDocument()
  })

  it("links the related posts with their dates and reading times", async () => {
    await renderBlog({ locale: "en-US", path: "/blog/guide" })
    const related = within(section(screen.getByRole("heading", { level: 2, name: pagesBlogMessages.post.related }), "section"))
    expect(related.getByRole("link", { name: "Related guide" })).toHaveAttribute("href", "/blog/related")
    expect(related.getByText("9 min read", { exact: false })).toBeVisible()
  })

  it("describes the article to search engines and social networks in the page's language", async () => {
    await renderBlog({ locale: "pl-PL", path: "/pl-PL/blog/guide", post: POLISH_GUIDE })
    const tags = [plPagesBlogMessages.tags[BLOG_TAG.TESTING], plPagesBlogMessages.tags[BLOG_TAG.TOOLING]]
    const structuredData: unknown = JSON.parse(document.querySelector('script[type="application/ld+json"]')?.textContent ?? "{}")
    expect([...document.querySelectorAll('meta[property="article:tag"]')].map((meta) => meta.getAttribute("content"))).toStrictEqual(tags)
    expect(structuredData).toMatchObject({
      "@graph": [
        { description: "Article description", inLanguage: "pl-PL", keywords: tags },
        {
          itemListElement: [
            expect.anything(),
            { item: `${APP_URL}/pl-PL/blog`, name: plPagesBlogMessages.metadata.title },
            expect.anything(),
          ],
        },
      ],
    })
  })

  it("links the feed of the blog's language and describes the blog to search engines", async () => {
    await renderBlog({ locale: "pl-PL", path: "/pl-PL/blog", posts: [GUIDE] })
    expect(screen.getByRole("link", { name: plPagesBlogMessages.index.feed })).toHaveAttribute("href", "/pl-PL/blog/rss.xml")
    const structuredData: unknown = JSON.parse(document.querySelector('script[type="application/ld+json"]')?.textContent ?? "{}")
    expect(structuredData).toMatchObject({ "@type": "Blog", blogPost: [{ headline: SHARED_TITLE }], inLanguage: "pl-PL" })
  })
})

const searchParam = (name: string, param: string, index: number): string | null =>
  new URL(screen.getAllByRole("link", { name })[index]?.getAttribute("href") ?? "").searchParams.get(param)

describe("sharing a blog post", () => {
  it("shares the canonical URL and title on every network from the header and the end of the article", async () => {
    await renderBlog({ locale: "en-US", path: "/blog/guide" })
    const url = `${APP_URL}/blog/guide`
    const { targets } = pagesBlogMessages.post.share

    expect(screen.getAllByRole("list", { name: pagesBlogMessages.post.share.label })).toHaveLength(2)
    for (const index of [0, 1]) {
      expect([searchParam(targets.x, "text", index), searchParam(targets.x, "url", index)]).toStrictEqual([SHARED_TITLE, url])
      expect(searchParam(targets.linkedin, "url", index)).toBe(url)
      expect(searchParam(targets.bluesky, "text", index)).toBe(`${SHARED_TITLE} ${url}`)
      expect([searchParam(targets.hackerNews, "u", index), searchParam(targets.hackerNews, "t", index)]).toStrictEqual([url, SHARED_TITLE])
      expect([searchParam(targets.reddit, "url", index), searchParam(targets.reddit, "title", index)]).toStrictEqual([url, SHARED_TITLE])
      expect(screen.getAllByRole("link", { name: targets.email })[index]).toHaveAttribute(
        "href",
        `mailto:?subject=${encodeURIComponent(SHARED_TITLE)}&body=${encodeURIComponent(url)}`,
      )
    }
    for (const name of [targets.x, targets.linkedin, targets.bluesky, targets.hackerNews, targets.reddit]) {
      for (const link of screen.getAllByRole("link", { name })) {
        expect(link).toHaveAttribute("rel", "noopener noreferrer")
        expect(link).toHaveAttribute("target", "_blank")
      }
    }
    expect(screen.getAllByRole("link", { name: targets.email })[0]).not.toHaveAttribute("target")
  })

  it("copies the canonical URL and confirms it beside the button and in an announced notification", async () => {
    const user = userEvent.setup({ delay: null })
    const success = vi.spyOn(toast, "success")
    await renderBlog({ locale: "en-US", path: "/blog/guide" })
    const [copy] = screen.getAllByRole("button", { name: pagesBlogMessages.post.share.copy })
    if (!copy) {
      throw new Error("Missing copy button")
    }
    await user.click(copy)
    expect(await navigator.clipboard.readText()).toBe(`${APP_URL}/blog/guide`)
    expect(success).toHaveBeenCalledExactlyOnceWith(pagesBlogMessages.post.share.copied)
    expect(copy).toHaveClass("text-ring")
  })

  it("puts the copy confirmation away after a moment", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi), delay: null })
      await renderBlog({ locale: "en-US", path: "/blog/guide" })
      const [copy] = screen.getAllByRole("button", { name: pagesBlogMessages.post.share.copy })
      await user.click(copy ?? document.body)
      await vi.waitFor(() => {
        expect(copy).toHaveClass("text-ring")
      })
      await act(() => vi.advanceTimersByTimeAsync(2000))
      expect(copy).not.toHaveClass("text-ring")
    } finally {
      vi.useRealTimers()
    }
  })

  it("says so when the browser refuses to copy", async () => {
    const user = userEvent.setup({ delay: null })
    const failure = vi.spyOn(toast, "error")
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("Clipboard denied"))
    await renderBlog({ locale: "en-US", path: "/blog/guide" })
    await user.click(screen.getAllByRole("button", { name: pagesBlogMessages.post.share.copy })[0] ?? document.body)
    await waitFor(() => {
      expect(failure).toHaveBeenCalledExactlyOnceWith(pagesBlogMessages.post.share.copyFailed)
    })
  })

  it("keeps the native share button's place but hides it where the browser cannot share", async () => {
    await renderBlog({ locale: "en-US", path: "/blog/guide" })
    const buttons = screen.getAllByRole("button", { name: pagesBlogMessages.post.share.native })
    expect(buttons.map((button) => button.closest("li"))).toStrictEqual([...document.querySelectorAll("li.invisible")])
    expect(buttons).toHaveLength(2)
  })

  it.each([
    { copied: false, error: new DOMException("Share cancelled", "AbortError"), outcome: "does nothing when the reader cancels" },
    { copied: true, error: new DOMException("Share failed", "DataError"), outcome: "copies the link when sharing fails" },
    { copied: false, error: undefined, outcome: "hands the post to the share sheet" },
  ])("opens the system share sheet where the browser has one and $outcome", async ({ copied, error }) => {
    const user = userEvent.setup({ delay: null })
    const share = vi.fn(() => (error === undefined ? Promise.resolve() : Promise.reject(error)))
    Object.defineProperty(navigator, "share", { configurable: true, value: share })
    const success = vi.spyOn(toast, "success")
    try {
      await renderBlog({ locale: "en-US", path: "/blog/guide" })
      const [native] = await screen.findAllByRole("button", { name: pagesBlogMessages.post.share.native })
      await user.click(native ?? document.body)
      expect(share).toHaveBeenCalledExactlyOnceWith({ title: SHARED_TITLE, url: `${APP_URL}/blog/guide` })
      await waitFor(() => {
        expect(success).toHaveBeenCalledTimes(copied ? 1 : 0)
      })
    } finally {
      Reflect.deleteProperty(navigator, "share")
    }
  })
})
