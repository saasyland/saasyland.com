import { createMemoryHistory } from "@tanstack/react-router"
import { getRequest } from "@tanstack/react-start/server"
import { describe, expect, it, vi } from "vite-plus/test"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { Route as AuthorRoute } from "~/src/routes/_site._marketing.authors.$author"
import { Route as BlogPostRoute } from "~/src/routes/_site._marketing.blog.$"
import { Route as BlogArchiveRoute } from "~/src/routes/_site._marketing.blog.page.$page"

import { BLOG_ARCHIVE, BLOG_AUTHOR, BLOG_AUTHORS, BLOG_TAG } from "~/src/data/blog"

import { BLOG_FEED_TYPE } from "~/src/lib/feed"
import { ROBOTS, buildTitle } from "~/src/lib/seo"

import { blogContent } from "~/src/presentation/components/custom/blog-content"

import notFoundMessages from "~/messages/en-US/errors.not-found.json"
import pagesBlogMessages from "~/messages/en-US/pages.blog.json"
import frPagesBlogMessages from "~/messages/fr-FR/pages.blog.json"
import plPagesBlogMessages from "~/messages/pl-PL/pages.blog.json"
import { APP_URL } from "~/src/presentation/branding"
import { getRouter } from "~/src/router"
import { ROUTES } from "~/src/routes"

const { loadBlogIndex } = await vi.hoisted(async () => {
  const blog = await import("~/src/data/blog")
  const base = {
    author: blog.BLOG_AUTHOR.PIOTR_BOROWIECKI,
    date: "2026-09-01",
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
        description: "Article description",
        image: "/article.webp",
        title: "Complete guide",
        toc: [
          { depth: 2, title: "Introduction", url: "#intro" },
          { depth: 3, title: "Deploy", url: "#deploy" },
        ],
        updated: "2025-07-01",
      }),
      post(blog.FEATURED_BLOG_POSTS[0], { date: "2025-01-01", title: "Featured" }),
      post("minimal", { date: "2024-01-01", summary: undefined, tags: [], title: "Minimal" }),
    ],
    "fr-FR": Array.from({ length: blog.BLOG_ARCHIVE.PAGE_SIZE + 1 }, (_, index) =>
      post(`article-${String(index + 1)}`, { title: `Article ${String(index + 1)}` }, "fr-FR"),
    ),
    "pl-PL": [post("guide", { title: "Przewodnik" }, "pl-PL")],
  }

  return {
    loadBlogIndex: vi.fn((locale: string) =>
      locale === "it-IT" ? Promise.reject(new Error("The blog index could not be loaded")) : Promise.resolve(posts[locale] ?? []),
    ),
  }
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

describe("landing notes loader", () => {
  it("leads the notes with the first featured post, then lists the newest others", async () => {
    const router = await load("/")
    expect(router.state.matches.at(-1)?.loaderData).toMatchObject({
      locale: "en-US",
      notes: { latest: [{ title: "Recent" }, { title: "Older" }, { title: "Complete guide" }], lead: { title: "Featured" } },
    })
  })

  it("leads the notes with the newest post when the language has no featured post", async () => {
    const router = await load("/pl-PL")
    expect(router.state.matches.at(-1)?.loaderData).toMatchObject({ notes: { latest: [], lead: { title: "Przewodnik" } } })
  })

  it("leaves the notes without a lead when the language has no post", async () => {
    const router = await load("/de-DE")
    expect(router.state.matches.at(-1)?.loaderData).toMatchObject({ notes: { latest: [], lead: undefined } })
  })
})

describe("blog index loader", () => {
  it("lists the posts of the blog index with their summary, tags and reading time, and picks the featured and latest posts", async () => {
    const router = await load("/blog")
    expect(router.state.matches.at(-1)?.loaderData).toMatchObject({
      featured: [{ title: "Featured" }],
      latest: [{ title: "Recent" }, { title: "Older" }, { title: "Complete guide" }],
      locale: "en-US",
      metadata: pagesBlogMessages.metadata,
      pages: 1,
      posts: [
        { readingTimeMinutes: 5, summary: "Article summary", tags: [BLOG_TAG.TANSTACK_START], title: "Recent", url: "/blog/recent" },
        { title: "Older" },
        { title: "Complete guide" },
        { title: "Featured" },
        { summary: undefined, tags: [], title: "Minimal" },
      ],
      updated: [],
    })
    expect(router.state.matches.at(-1)?.links?.filter((link) => link?.rel === "next")).toStrictEqual([])
  })

  it("names the archive's second page as the next page when the posts fill more than one", async () => {
    const router = await load("/fr-FR/blog")
    expect(router.state.matches.at(-1)?.loaderData).toMatchObject({ pages: 2 })
    expect(router.state.matches.at(-1)?.links).toContainEqual({ href: `${APP_URL}/fr-FR${ROUTES.BLOG.INDEX}/page/2`, rel: "next" })
  })
})

describe("blog index head", () => {
  it("names no next page when the blog's posts fail to load", async () => {
    const router = await load("/it-IT/blog")
    const index = router.state.matches.at(-1)
    expect(index?.status).toBe("error")
    expect(index?.links?.filter((link) => link?.rel === "next")).toStrictEqual([])
  })
})

describe("blog archive loader", () => {
  it("lists one page of the archive under its own title, address and neighbours", async () => {
    const router = await load("/fr-FR/blog/page/2")
    const archive = router.state.matches.at(-1)
    const title = `${frPagesBlogMessages.metadata.title}, page 2`

    expect(archive?.routeId).toBe(BlogArchiveRoute.id)
    expect(archive?.loaderData).toMatchObject({
      blogTitle: frPagesBlogMessages.metadata.title,
      listed: [
        {
          title: `Article ${String(BLOG_ARCHIVE.PAGE_SIZE + 1)}`,
          url: `/fr-FR${ROUTES.BLOG.INDEX}/article-${String(BLOG_ARCHIVE.PAGE_SIZE + 1)}`,
        },
      ],
      locale: "fr-FR",
      metadata: { description: frPagesBlogMessages.metadata.description, title },
      offset: BLOG_ARCHIVE.PAGE_SIZE,
      page: 2,
      pages: 2,
      total: BLOG_ARCHIVE.PAGE_SIZE + 1,
    })
    expect(archive?.meta).toContainEqual({ title: buildTitle({ locale: "fr-FR", title }) })
    expect(archive?.links).toContainEqual({ href: `${APP_URL}/fr-FR${ROUTES.BLOG.INDEX}/page/2`, rel: "canonical" })
    expect(archive?.links).toContainEqual({ href: `${APP_URL}/fr-FR${ROUTES.BLOG.INDEX}`, rel: "prev" })
    expect(archive?.links?.filter((link) => link?.rel === "next")).toStrictEqual([])
  })

  it.each(["/fr-FR/blog/page/1", "/fr-FR/blog/page/3", "/fr-FR/blog/page/02", "/fr-FR/blog/page/two", "/blog/page/2"])(
    "answers %s as not found and keeps it out of search results",
    async (path) => {
      const router = await load(path)
      const archive = router.state.matches.find((match) => match.routeId === BlogArchiveRoute.id)
      expect(archive?.status).toBe("notFound")
      expect(archive?.meta).toContainEqual({ content: ROBOTS.NOINDEX, name: "robots" })
    },
  )

  it("keeps an archive page that failed to load out of search results", async () => {
    const router = await load("/it-IT/blog/page/2")
    const archive = router.state.matches.find((match) => match.routeId === BlogArchiveRoute.id)
    expect(archive?.status).toBe("error")
    expect(archive?.meta).toContainEqual({ content: ROBOTS.NOINDEX, name: "robots" })
  })
})

describe("blog post loader", () => {
  it("loads the article with its table of contents and preloads its content", async () => {
    const router = await load("/blog/complete")
    expect(blogContent.preload).toHaveBeenCalledExactlyOnceWith("complete.en-US.mdx")
    expect(router.state.matches.at(-1)?.loaderData).toMatchObject({
      locale: "en-US",
      post: {
        author: BLOG_AUTHOR.PIOTR_BOROWIECKI,
        description: "Article description",
        image: "/article.webp",
        path: "complete.en-US.mdx",
        related: [{ title: "Recent" }, { title: "Older" }, { title: "Featured" }],
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
        { content: "Article description", name: "description" },
        { content: BLOG_AUTHORS[BLOG_AUTHOR.PIOTR_BOROWIECKI].name, name: "author" },
        { content: "2025-06-01T00:00:00.000Z", property: "article:published_time" },
        { content: "2025-07-01T00:00:00.000Z", property: "article:modified_time" },
        { content: `${APP_URL}${ROUTES.AUTHORS}/${BLOG_AUTHOR.PIOTR_BOROWIECKI}`, property: "article:author" },
      ]),
    )
  })

  it("relates the newest posts when none shares a tag with the article", async () => {
    const router = await load("/blog/minimal")
    expect(router.state.matches.at(-1)?.loaderData).toMatchObject({
      post: { related: [{ title: "Recent" }, { title: "Older" }, { title: "Complete guide" }] },
    })
  })

  it("describes an article without its own description by its summary", async () => {
    const router = await load("/blog/recent")
    expect(router.state.matches.at(-1)?.meta).toContainEqual({ content: "Article summary", name: "description" })
  })

  it("names the blog's feed in the head of the blog and its posts", async () => {
    const router = await load("/pl-PL/blog/guide")
    const blog = router.state.matches.find(({ routeId }) => routeId === "/_site/_marketing/blog")
    expect(blog?.links).toContainEqual({
      href: `${APP_URL}/pl-PL${ROUTES.BLOG.FEED}`,
      rel: "alternate",
      title: buildTitle({ locale: "pl-PL", title: plPagesBlogMessages.metadata.title }),
      type: BLOG_FEED_TYPE,
    })
  })

  it("loads an article without a summary or image", async () => {
    const router = await load("/blog/minimal")
    expect(router.state.matches.at(-1)?.loaderData).toMatchObject({
      post: { image: undefined, summary: undefined, title: "Minimal" },
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
    expect(article?.meta).toContainEqual({ content: `${APP_URL}${ROUTES.BLOG.INDEX}`, property: "og:url" })
  })

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
      posts: [{ title: "Przewodnik", url: "/pl-PL/blog/guide" }],
    })
  })
})

describe("author loader", () => {
  it("loads the author with every post of the page's language by that author", async () => {
    const router = await load(`/pl-PL${ROUTES.AUTHORS}/${BLOG_AUTHOR.PIOTR_BOROWIECKI}`)
    const author = router.state.matches.find((match) => match.routeId === AuthorRoute.id)

    expect(author?.loaderData).toMatchObject({
      author: BLOG_AUTHOR.PIOTR_BOROWIECKI,
      description: plPagesBlogMessages.authors[BLOG_AUTHOR.PIOTR_BOROWIECKI].bio,
      locale: "pl-PL",
      posts: [{ title: "Przewodnik", url: "/pl-PL/blog/guide" }],
    })
    expect(author?.meta).toStrictEqual(
      expect.arrayContaining([
        { title: buildTitle({ locale: "pl-PL", title: BLOG_AUTHORS[BLOG_AUTHOR.PIOTR_BOROWIECKI].name }) },
        { content: plPagesBlogMessages.authors[BLOG_AUTHOR.PIOTR_BOROWIECKI].bio, name: "description" },
        { content: "profile", property: "og:type" },
        { content: `${APP_URL}/pl-PL${ROUTES.AUTHORS}/${BLOG_AUTHOR.PIOTR_BOROWIECKI}`, property: "og:url" },
      ]),
    )
  })

  it("lists no posts in a language the author has not published in", async () => {
    const router = await load(`/de-DE${ROUTES.AUTHORS}/${BLOG_AUTHOR.PIOTR_BOROWIECKI}`)
    const author = router.state.matches.find((match) => match.routeId === AuthorRoute.id)

    expect(author?.loaderData).toMatchObject({ author: BLOG_AUTHOR.PIOTR_BOROWIECKI, locale: "de-DE", posts: [] })
  })

  it("answers an author the blog does not know as not found", async () => {
    const router = await load(`${ROUTES.AUTHORS}/someone-else`)
    const author = router.state.matches.find((match) => match.routeId === AuthorRoute.id)

    expect(author?.status).toBe("notFound")
    expect(author?.meta).toStrictEqual(NOT_FOUND_META)
  })
})
