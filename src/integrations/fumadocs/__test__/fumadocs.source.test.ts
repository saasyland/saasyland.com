import { describe, expect, it, vi } from "vite-plus/test"

import { getPublishedBlogPosts } from "~/src/integrations/fumadocs/fumadocs.source"

const { blog } = vi.hoisted(() => {
  const base = { authorName: "Test Author", published: true, toc: [] }
  return {
    blog: [
      {
        ...base,
        date: "2025-01-01",
        description: "Older description",
        info: { fullPath: "/content/blog/older.en-US.mdx", path: "older.en-US.mdx" },
        structuredData: { contents: [{ content: "word ".repeat(440), heading: undefined }], headings: [] },
        title: "Older",
      },
      {
        ...base,
        date: "2026-01-01",
        description: "Newer description",
        excerpt: "Newer excerpt",
        info: { fullPath: "/content/blog/newer.en-US.mdx", path: "newer.en-US.mdx" },
        structuredData: { contents: [{ content: "word ".repeat(660), heading: undefined }], headings: [] },
        tags: ["stack"],
        title: "Newer",
      },
      {
        ...base,
        date: "2026-06-01",
        info: { fullPath: "/content/blog/draft.en-US.mdx", path: "draft.en-US.mdx" },
        published: false,
        structuredData: { contents: [{ content: "word ".repeat(10), heading: undefined }], headings: [] },
        title: "Draft",
      },
      {
        ...base,
        date: "2024-01-01",
        info: { fullPath: "/content/blog/short.en-US.mdx", path: "short.en-US.mdx" },
        structuredData: { contents: [{ content: "Three short words", heading: undefined }], headings: [] },
        title: "Short",
      },
      {
        ...base,
        date: "2026-01-01",
        info: { fullPath: "/content/blog/newer.ja-JP.mdx", path: "newer.ja-JP.mdx" },
        structuredData: { contents: [{ content: "認証と請求の仕組みを学びます。".repeat(100), heading: undefined }], headings: [] },
        title: "日本語",
      },
    ],
  }
})

vi.mock("collections/server", () => ({ blog, docs: { toFumadocsSource: () => ({ files: [] }) } }))

describe("published blog posts", () => {
  it("lists published posts newest first with their summary and localized url", () => {
    const posts = getPublishedBlogPosts("en-US")

    expect(posts.map((post) => post.title)).toStrictEqual(["Newer", "Older", "Short"])
    expect(posts[0]).toMatchObject({ featured: false, summary: "Newer excerpt", tags: ["stack"], url: "/blog/newer" })
    expect(posts[1]).toMatchObject({ summary: "Older description", tags: [] })
  })

  it("estimates one minute per 220 words, and never less than a minute", () => {
    expect(getPublishedBlogPosts("en-US").map((post) => post.readingTimeMinutes)).toStrictEqual([3, 2, 1])
  })

  it("localizes urls and counts words in Japanese prose without spaces", () => {
    const [post] = getPublishedBlogPosts("ja-JP")

    expect(post?.url).toBe("/ja-JP/blog/newer")
    expect(post?.readingTimeMinutes).toBeGreaterThan(1)
  })
})
