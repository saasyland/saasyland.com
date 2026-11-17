import { describe, expect, it, vi } from "vite-plus/test"

import { getPublishedBlogPosts } from "~/src/integrations/fumadocs/fumadocs.source"

import { BLOG_TAG } from "~/src/data/blog"

const { blog } = await vi.hoisted(async () => {
  const { BLOG_TAG: TAG } = await import("~/src/data/blog")
  const base = { authorName: "Test Author", published: true }
  const post = (fields: Record<string, unknown>, content: string) => ({
    ...base,
    ...fields,
    load: () => Promise.resolve({ structuredData: { contents: [{ content, heading: undefined }], headings: [] }, toc: [] }),
  })
  return {
    blog: [
      post(
        {
          date: "2025-01-01",
          description: "Older description",
          info: { fullPath: "/content/blog/older.en-US.mdx", path: "older.en-US.mdx" },
          title: "Older",
        },
        "word ".repeat(440),
      ),
      post(
        {
          date: "2026-01-01",
          description: "Newer description",
          excerpt: "Newer excerpt",
          info: { fullPath: "/content/blog/newer.en-US.mdx", path: "newer.en-US.mdx" },
          tags: [TAG.STACK],
          title: "Newer",
        },
        "word ".repeat(660),
      ),
      post(
        {
          date: "2026-06-01",
          info: { fullPath: "/content/blog/draft.en-US.mdx", path: "draft.en-US.mdx" },
          published: false,
          title: "Draft",
        },
        "word ".repeat(10),
      ),
      post(
        { date: "2024-01-01", info: { fullPath: "/content/blog/short.en-US.mdx", path: "short.en-US.mdx" }, title: "Short" },
        "Three short words",
      ),
      post(
        { date: "2026-01-01", info: { fullPath: "/content/blog/newer.ja-JP.mdx", path: "newer.ja-JP.mdx" }, title: "日本語" },
        "認証と請求の仕組みを学びます。".repeat(100),
      ),
    ],
  }
})

vi.mock("collections/server", () => ({ blog, docs: { toFumadocsSource: () => ({ files: [] }) } }))

describe("published blog posts", () => {
  it("lists published posts newest first with their summary and localized url", async () => {
    const posts = await getPublishedBlogPosts("en-US")

    expect(posts.map((post) => post.title)).toStrictEqual(["Newer", "Older", "Short"])
    expect(posts[0]).toMatchObject({ featured: false, summary: "Newer excerpt", tags: [BLOG_TAG.STACK], url: "/blog/newer" })
    expect(posts[1]).toMatchObject({ summary: "Older description", tags: [] })
  })

  it("estimates one minute per 220 words, and never less than a minute", async () => {
    const posts = await getPublishedBlogPosts("en-US")

    expect(posts.map((post) => post.readingTimeMinutes)).toStrictEqual([3, 2, 1])
  })

  it("localizes urls and counts words in Japanese prose without spaces", async () => {
    const [post] = await getPublishedBlogPosts("ja-JP")

    expect(post?.url).toBe("/ja-JP/blog/newer")
    expect(post?.readingTimeMinutes).toBeGreaterThan(1)
  })
})
