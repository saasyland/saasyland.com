import { createMemoryHistory } from "@tanstack/react-router"
import { getRequest } from "@tanstack/react-start/server"
import { describe, expect, it, vi } from "vite-plus/test"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { Route as BlogPostRoute } from "~/src/routes/blog.$"

import { starCountQuery } from "~/src/lib/github"

import { blogContent } from "~/src/presentation/components/custom/blog-content"

import pagesBlogMessages from "~/messages/en-US/pages.blog.json"
import { APP_NAME, APP_URL } from "~/src/presentation/branding"
import { getRouter } from "~/src/router"
import { ROUTES } from "~/src/routes"

vi.mock("collections/server", async () => {
  const { createElement } = await import("react")
  const prose = { contents: [{ content: "word ".repeat(1100), heading: undefined }], headings: [] }
  const post = (slug: string, data: Record<string, unknown>, locale = "en-US") => ({
    authorName: "Ada",
    date: "2026-09-01",
    description: "Article summary",
    info: { fullPath: `/content/blog/${slug}.${locale}.mdx`, path: `${slug}.${locale}.mdx` },
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
      post("guide", { title: "Przewodnik" }, "pl-PL"),
    ],
    docs: { toFumadocsSource: () => ({ files: [] }) },
  }
})
vi.mock("~/src/presentation/components/custom/blog-content", () => ({
  blogContent: { preload: vi.fn(() => Promise.resolve()) },
}))

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
})

describe("blog index loader", () => {
  it("lists published posts newest first with their summary, tags and reading time", async () => {
    const router = await load("/blog")
    expect(router.state.matches.at(-1)?.loaderData).toMatchObject({
      locale: "en-US",
      metadata: pagesBlogMessages.metadata,
      posts: [
        { readingTimeMinutes: 5, summary: "Article summary", tags: ["React"], title: "Recent", url: "/blog/recent" },
        { title: "Older" },
        { title: "Complete guide" },
        { title: "Featured" },
        { summary: undefined, tags: [], title: "Minimal" },
      ],
    })
  })
})

describe("blog post loader", () => {
  it("loads the article with a plain-text table of contents and preloads its content", async () => {
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
          { depth: 3, title: "Step 1 — Deploy", url: "#deploy" },
          { depth: 3, title: "Ship it today", url: "#ship" },
        ],
        url: "/blog/complete",
      },
    })
  })

  it("loads an article without a summary, image or frequently asked questions", async () => {
    const router = await load("/blog/minimal")
    expect(router.state.matches.at(-1)?.loaderData).toMatchObject({
      post: { faq: undefined, image: undefined, summary: undefined, title: "Minimal" },
    })
  })

  it("keeps the blog index as the canonical page of a missing article", async () => {
    const router = await load("/blog/missing")
    const article = router.state.matches.find((match) => match.routeId === BlogPostRoute.id)
    expect(article?.meta).toContainEqual({ content: `${APP_URL}${ROUTES.BLOG}`, property: "og:url" })
    expect(article?.meta).toContainEqual({ title: APP_NAME })
  })

  it.each<{ _splat?: string }>([{ _splat: "draft" }, { _splat: "missing" }, { _splat: "" }, {}])(
    "treats params %j as a missing article",
    async (params) => {
      const { input, loader } = await captureBlogPostLoad("/blog/complete")
      await expect(loader({ ...input, params })).rejects.toMatchObject({ isNotFound: true })
    },
  )

  it("loads the post in the page's locale when the server function request carries another locale's cookie", async () => {
    const { input, loader } = await captureBlogPostLoad("/pl-PL/blog/guide")
    vi.mocked(getRequest)
      .mockReturnValueOnce(new Request("http://127.0.0.1:3000/pl-PL/blog/guide"))
      .mockReturnValue(new Request("http://127.0.0.1:3000/_serverFn/blog-post", { headers: { cookie: `${I18N.COOKIE_NAME}=en-US` } }))
    await expect(loader(input)).resolves.toMatchObject({ locale: "pl-PL", post: { title: "Przewodnik" } })
  })
})
