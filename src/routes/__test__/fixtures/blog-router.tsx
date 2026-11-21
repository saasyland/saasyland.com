import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Outlet, RouterProvider, createMemoryHistory, createRootRouteWithContext, createRouter } from "@tanstack/react-router"
import { getRequest } from "@tanstack/react-start/server"
import { act, cleanup, render } from "@testing-library/react"
import { IntlProvider } from "use-intl"
import { afterEach, beforeEach, vi } from "vite-plus/test"

import { type BlogPostSummary, blogArchivePageCount } from "~/src/integrations/fumadocs/fumadocs.blog"
import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"
import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { deLocalizeUrl, localizeUrl } from "~/src/integrations/use-intl/i18n.utils"

import { Route as SiteRoute } from "~/src/routes/_site"
import { Route as MarketingRoute } from "~/src/routes/_site._marketing"
import { Route as BlogRoute } from "~/src/routes/_site._marketing.blog"
import { Route as BlogPostRoute } from "~/src/routes/_site._marketing.blog.$"
import { Route as BlogIndexRoute } from "~/src/routes/_site._marketing.blog.index"
import { Route as BlogArchiveRoute } from "~/src/routes/_site._marketing.blog.page.$page"

import { BLOG_ARCHIVE, BLOG_TAG } from "~/src/data/blog"

import pagesBlogMessages from "~/messages/en-US/pages.blog.json"
import type { RouterContext } from "~/src/router"

export type BlogPost = (typeof BlogPostRoute.types.loaderData)["post"]

export const SHARED_TITLE = "React & SaaS / launch"

export const RELATED: BlogPostSummary = {
  date: "2026-08-15",
  image: "/images/blog/related.webp",
  readingTimeMinutes: 9,
  summary: "Related summary",
  tags: [BLOG_TAG.SAAS],
  title: "Related guide",
  updated: undefined,
  url: "/blog/related",
}

export const GUIDE: BlogPost = {
  authorImage: "/images/blog/authors/ada.webp",
  authorName: "Ada",
  authorUrl: "https://github.com/ada",
  date: "2026-09-01",
  description: "Article description",
  faq: undefined,
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

export const POLISH_GUIDE: BlogPost = {
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

export const MINIMAL: BlogPostSummary = {
  date: "2024-01-01",
  image: undefined,
  readingTimeMinutes: 1,
  summary: undefined,
  tags: [],
  title: "Minimal",
  updated: undefined,
  url: "/blog/minimal",
}

export const routers: ReturnType<typeof createBlogRouter>[] = []

export type BlogIndexData = typeof BlogIndexRoute.types.loaderData

export type BlogArchiveData = typeof BlogArchiveRoute.types.loaderData

export const createBlogRouter = ({
  archive,
  index,
  locale,
  path,
  post,
  posts,
  rail,
}: {
  archive: Partial<BlogArchiveData>
  index: Partial<BlogIndexData>
  locale: SupportedLocale
  path: string
  post: BlogPost
  posts: BlogPostSummary[]
  rail: { title: string; url: string }[]
}) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const root = createRootRouteWithContext<RouterContext>()({ component: Outlet })
  Object.assign(SiteRoute.options, { getParentRoute: () => root, id: "_site" })
  Object.assign(MarketingRoute.options, { getParentRoute: () => SiteRoute, id: "_marketing" })
  Object.assign(BlogRoute.options, { getParentRoute: () => MarketingRoute, id: "/blog", path: "/blog" })
  Object.assign(BlogIndexRoute.options, {
    getParentRoute: () => BlogRoute,
    id: "/",
    loader: (): BlogIndexData => ({
      featured: [],
      latest: [],
      locale,
      metadata: pagesBlogMessages.metadata,
      pages: blogArchivePageCount(posts.length),
      posts,
      updated: [],
      ...index,
    }),
    path: "/",
  })
  Object.assign(BlogArchiveRoute.options, {
    getParentRoute: () => BlogRoute,
    id: "/page/$page",
    loader: (): BlogArchiveData => ({
      blogTitle: pagesBlogMessages.metadata.title,
      listed: posts,
      locale,
      metadata: { description: pagesBlogMessages.metadata.description, title: "Blog, page 2" },
      offset: BLOG_ARCHIVE.PAGE_SIZE,
      page: 2,
      pages: 2,
      total: BLOG_ARCHIVE.PAGE_SIZE + posts.length,
      ...archive,
    }),
    path: "/page/$page",
  })
  Object.assign(BlogPostRoute.options, {
    getParentRoute: () => BlogRoute,
    id: "/$",
    loader: (): typeof BlogPostRoute.types.loaderData => ({ locale, post, posts: rail, section: pagesBlogMessages.metadata.title }),
    path: "/$",
  })
  const blog = BlogRoute.addChildren([BlogIndexRoute, BlogArchiveRoute, BlogPostRoute])
  const site = SiteRoute.addChildren([MarketingRoute.addChildren([blog])])
  return createRouter({
    context: { queryClient },
    defaultPendingMinMs: 0,
    history: createMemoryHistory({ initialEntries: [path] }),
    rewrite: { input: ({ url }) => deLocalizeUrl(url), output: ({ url }) => localizeUrl(url) },
    routeTree: root.addChildren([site]),
  })
}

export const renderBlog = async ({
  archive = {},
  index = {},
  locale,
  path,
  post = GUIDE,
  posts = [],
  rail = [
    { title: GUIDE.title, url: GUIDE.url },
    { title: RELATED.title, url: RELATED.url },
  ],
}: {
  archive?: Partial<BlogArchiveData>
  index?: Partial<BlogIndexData>
  locale: SupportedLocale
  path: string
  post?: BlogPost
  posts?: BlogPostSummary[]
  rail?: { title: string; url: string }[]
}) => {
  vi.mocked(getRequest).mockReturnValue(new Request(`http://127.0.0.1:3000${path}`))
  const router = createBlogRouter({ archive, index, locale, path, post, posts, rail })
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

export const metaTimes = (): Element[] => [...document.querySelectorAll("article time")].filter((time) => time.closest("section") === null)

export const section = (element: HTMLElement, selector: "aside" | "section"): HTMLElement => {
  const container = element.closest(selector)
  if (!container) {
    throw new Error(`Missing ${selector}`)
  }
  return container
}

export const useBlogTestEnvironment = (): void => {
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
}
