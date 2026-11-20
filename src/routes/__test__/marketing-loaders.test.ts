import { createMemoryHistory, rootRouteId } from "@tanstack/react-router"
import { getRequest } from "@tanstack/react-start/server"
import { describe, expect, it, vi } from "vite-plus/test"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { CURRENCY_FORMAT } from "~/src/modules/_core/constants/pricing"
import { LICENSE_TIER } from "~/src/modules/license/license.constants"

import { Route as SiteRoute } from "~/src/routes/_site"
import { Route as MarketingRoute } from "~/src/routes/_site._marketing"
import { Route as NotFoundRoute } from "~/src/routes/_site._marketing.$"
import { Route as BlogPostRoute } from "~/src/routes/_site._marketing.blog.$"

import { BLOG_TAG } from "~/src/data/blog"
import { TIER_PRICES } from "~/src/data/marketing"
import { REPOSITORY_FACTS } from "~/src/data/repository-facts"

import { starCountQuery } from "~/src/lib/github"
import { ROBOTS, buildTitle } from "~/src/lib/seo"

import { blogContent } from "~/src/presentation/components/custom/blog-content"

import notFoundMessages from "~/messages/en-US/errors.not-found.json"
import pagesBlogMessages from "~/messages/en-US/pages.blog.json"
import pagesLandingMessages from "~/messages/en-US/pages.landing.json"
import { APP_URL } from "~/src/presentation/branding"
import { getRouter } from "~/src/router"
import { ROUTES } from "~/src/routes"

const { loadBlogIndex } = vi.hoisted(() => {
  const base = {
    authorName: "Ada",
    date: "2026-09-01",
    faq: undefined,
    featured: false,
    image: undefined,
    readingTimeMinutes: 5,
    summary: "Article summary",
    tags: ["tanstack-start"],
    toc: [],
    updated: undefined,
  }
  const post = (slug: string, fields: Record<string, unknown>, locale = "en-US") => ({
    ...base,
    path: `${slug}.${locale}.mdx`,
    url: `/blog/${slug}`,
    ...fields,
  })
  const posts: Record<string, unknown[]> = {
    "en-US": [
      post("recent", { date: "2026-09-02", title: "Recent" }),
      post("older", { title: "Older" }),
      post("complete", {
        date: "2025-06-01",
        faq: [{ answer: "Because.", question: "Why?" }],
        image: "/article.webp",
        title: "Complete guide",
        toc: [
          { depth: 2, title: "Introduction", url: "#intro" },
          { depth: 3, title: "Deploy", url: "#deploy" },
        ],
        updated: "2025-07-01",
      }),
      post("featured", { date: "2025-01-01", featured: true, title: "Featured" }),
      post("minimal", { authorName: " ", date: "2024-01-01", summary: undefined, tags: [], title: "Minimal" }),
    ],
    "pl-PL": [post("guide", { title: "Przewodnik" }, "pl-PL")],
  }

  return { loadBlogIndex: vi.fn((locale: string) => Promise.resolve(posts[locale] ?? [])) }
})

vi.mock("virtual:content-indexes", () => ({ loadBlogIndex }))
vi.mock("~/src/presentation/components/custom/blog-content", () => ({
  blogContent: { preload: vi.fn(() => Promise.resolve()) },
}))

const NOT_FOUND_META = [
  { title: buildTitle({ locale: I18N.DEFAULT_LOCALE, title: notFoundMessages.metadata.title }) },
  { content: notFoundMessages.metadata.description, name: "description" },
  { content: ROBOTS.NOINDEX, name: "robots" },
]

const createRouterAt = (path: string) => {
  vi.mocked(getRequest).mockReturnValue(new Request(`http://127.0.0.1:3000${path}`))
  const router = getRouter()
  router.options.context.queryClient.setDefaultOptions({ queries: { retry: false } })
  router.update({ context: router.options.context, history: createMemoryHistory({ initialEntries: [path] }) })
  return router
}

const load = async (path: string) => {
  const router = createRouterAt(path)
  await router.load()
  return router
}

const captureBlogPostLoad = async (path: string) => {
  const { loader } = BlogPostRoute.options
  if (typeof loader !== "function") {
    throw new TypeError("Blog posts must have a loader")
  }
  const capture = vi.fn(loader)
  BlogPostRoute.options.loader = capture
  try {
    await load(path)
  } finally {
    BlogPostRoute.options.loader = loader
  }
  const input = capture.mock.calls[0]?.[0]
  if (!input) {
    throw new Error("Blog loader was not called")
  }
  return { input, loader }
}

describe("landing loader", () => {
  it("selects featured notes first, then the newest posts, without drafts", async () => {
    const router = createRouterAt("/")
    router.options.context.queryClient.setQueryData(starCountQuery.queryKey, 456)
    await router.load()
    expect(router.state.matches.at(-1)?.loaderData).toMatchObject({
      locale: "en-US",
      posts: [{ title: "Featured" }, { title: "Recent" }, { title: "Older" }],
    })
  })

  it("describes the page with the entry price from TIER_PRICES", async () => {
    const router = await load("/")
    const price = new Intl.NumberFormat("en-US", CURRENCY_FORMAT).format(TIER_PRICES[LICENSE_TIER.CORE])
    expect(router.state.matches.at(-1)?.loaderData).toMatchObject({
      metadata: {
        description: pagesLandingMessages.metadata.description
          .replace("{price}", price)
          .replace("{coverageThreshold, number}", String(REPOSITORY_FACTS.coverageThreshold))
          .replace("{languages, number}", String(REPOSITORY_FACTS.languages)),
        title: pagesLandingMessages.metadata.title,
      },
    })
  })
})

describe("blog index loader", () => {
  it("lists the posts of the blog index with their summary, tags and reading time", async () => {
    const router = await load("/blog")
    expect(router.state.matches.at(-1)?.loaderData).toMatchObject({
      locale: "en-US",
      metadata: pagesBlogMessages.metadata,
      posts: [
        { readingTimeMinutes: 5, summary: "Article summary", tags: [BLOG_TAG.TANSTACK_START], title: "Recent", url: "/blog/recent" },
        { title: "Older" },
        { title: "Complete guide" },
        { title: "Featured" },
        { summary: undefined, tags: [], title: "Minimal" },
      ],
    })
  })
})

describe("blog post loader", () => {
  it("loads the article with its table of contents and preloads its content", async () => {
    const router = await load("/blog/complete")
    expect(blogContent.preload).toHaveBeenCalledExactlyOnceWith("complete.en-US.mdx")
    expect(router.state.matches.at(-1)?.loaderData).toMatchObject({
      locale: "en-US",
      post: {
        authorName: "Ada",
        faq: [{ answer: "Because.", question: "Why?" }],
        image: "/article.webp",
        path: "complete.en-US.mdx",
        summary: "Article summary",
        title: "Complete guide",
        toc: [
          { depth: 2, title: "Introduction", url: "#intro" },
          { depth: 3, title: "Deploy", url: "#deploy" },
        ],
        url: "/blog/complete",
      },
      section: pagesBlogMessages.metadata.title,
    })
    expect(router.state.matches.at(-1)?.meta).toStrictEqual(
      expect.arrayContaining([
        { content: pagesBlogMessages.metadata.title, property: "article:section" },
        { content: "2025-06-01T00:00:00.000Z", property: "article:published_time" },
        { content: "2025-07-01T00:00:00.000Z", property: "article:modified_time" },
      ]),
    )
  })

  it("loads an article without a summary, image or frequently asked questions", async () => {
    const router = await load("/blog/minimal")
    expect(router.state.matches.at(-1)?.loaderData).toMatchObject({
      post: { faq: undefined, image: undefined, summary: undefined, title: "Minimal" },
    })
  })

  it("titles a missing article as not found and keeps it out of search results", async () => {
    const router = await load("/blog/missing")
    const article = router.state.matches.find((match) => match.routeId === BlogPostRoute.id)
    expect(article?.status).toBe("notFound")
    expect(article?.meta).toStrictEqual(NOT_FOUND_META)
  })

  it("keeps the blog index as the address of an article that failed to load", async () => {
    vi.mocked(blogContent.preload).mockRejectedValueOnce(new Error("The article content could not be loaded"))
    const router = await load("/blog/complete")
    const article = router.state.matches.find((match) => match.routeId === BlogPostRoute.id)
    expect(article?.status).toBe("error")
    expect(article?.meta).toContainEqual({ content: `${APP_URL}${ROUTES.BLOG}`, property: "og:url" })
  })

  it.each(["/nope", "/pl-PL/a/b/c", "/auth/nope", "/admin/nope"])(
    "answers the unknown path %s from the site's not-found route",
    async (path) => {
      const router = await load(path)
      const notFoundMatch = router.state.matches.at(-1)
      expect(router.state.matches.map(({ routeId }) => routeId)).toStrictEqual([
        rootRouteId,
        SiteRoute.id,
        MarketingRoute.id,
        NotFoundRoute.id,
      ])
      expect(notFoundMatch?.status).toBe("notFound")
      expect(notFoundMatch?.meta).toContainEqual({ content: ROBOTS.NOINDEX, name: "robots" })
    },
  )

  it.each<{ _splat?: string }>([{ _splat: "missing" }, { _splat: "" }, {}])("treats params %j as a missing article", async (params) => {
    const { input, loader } = await captureBlogPostLoad("/blog/complete")
    await expect(loader({ ...input, params })).rejects.toMatchObject({ isNotFound: true })
  })

  it("loads the post from the blog index of the page's locale", async () => {
    const router = await load("/pl-PL/blog/guide")
    expect(loadBlogIndex).toHaveBeenCalledWith("pl-PL")
    expect(router.state.matches.at(-1)?.loaderData).toMatchObject({
      locale: "pl-PL",
      post: { title: "Przewodnik", url: "/pl-PL/blog/guide" },
    })
  })
})
