/** @vitest-environment jsdom */
import { type ReactNode, createElement } from "react"
import { createPortal } from "react-dom"

import { QueryClient } from "@tanstack/react-query"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { blogPostsQuery, getBlogPost, getBlogPosts } from "~/src/integrations/fumadocs/fumadocs.blog"

import { buildPostStructuredData } from "~/src/lib/blog"

const { faq, getPage, getPages } = vi.hoisted(() => {
  const faqEntries = [{ answer: "Only the individual post needs its complete FAQ.", question: "Where do these answers belong?" }]
  const page = {
    data: {
      authorName: "Test Author",
      date: "2026-09-01",
      faq: faqEntries,
      published: true,
      structuredData: { contents: [] },
      title: "en-US",
      toc: [] as { depth: number; title: ReactNode; url: string }[],
    },
    path: "example.mdx",
    url: "/blog/example",
  }
  return {
    faq: faqEntries,
    getPage: vi.fn<() => typeof page | undefined>(() => page),
    getPages: vi.fn((locale: string) => [{ ...page, data: { ...page.data, title: locale } }]),
  }
})

vi.mock("~/src/integrations/fumadocs/fumadocs.source", () => ({ blogSource: { getPage, getPages } }))

afterEach(() => vi.clearAllMocks())

describe("blog query cache", () => {
  it("fetches the keyed locale and keeps translated results separate", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const english = await queryClient.query(blogPostsQuery("en-US"))
    const polish = await queryClient.query(blogPostsQuery("pl-PL"))

    expect(getPages).toHaveBeenNthCalledWith(1, "en-US")
    expect(getPages).toHaveBeenNthCalledWith(2, "pl-PL")
    expect(english).toMatchObject([{ data: { title: "en-US" }, url: "/blog/example" }])
    expect(polish).toMatchObject([{ data: { title: "pl-PL" }, url: "/pl-PL/blog/example" }])
    await expect(queryClient.query(blogPostsQuery("en-US"))).resolves.toEqual(english)
    await expect(queryClient.query(blogPostsQuery("pl-PL"))).resolves.toEqual(polish)
    expect(getPages).toHaveBeenCalledTimes(2)
  })

  it("omits FAQ text from summaries while preserving the post's FAQ structured data", async () => {
    const [summary] = await getBlogPosts({ data: "en-US" })
    const post = await getBlogPost({ data: "example" })

    expect(summary?.data).not.toHaveProperty("faq")
    expect(post.data.faq).toEqual(faq)
    const structuredData = buildPostStructuredData({ ...post.data, baseUrl: "https://saasyland.com", url: post.url })
    expect(structuredData["@graph"]).toContainEqual({
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          acceptedAnswer: { "@type": "Answer", text: "Only the individual post needs its complete FAQ." },
          name: "Where do these answers belong?",
        },
      ],
    })
  })
})

describe("published blog content", () => {
  it("uses the current locale by default and excludes drafts", async () => {
    const [page] = getPages("en-US")
    if (!page) {
      throw new Error("Missing post fixture")
    }
    getPages.mockReturnValueOnce([page, { ...page, data: { ...page.data, published: false } }])
    const queryClient = new QueryClient()
    const posts = await queryClient.query(blogPostsQuery())
    expect(posts).toHaveLength(1)
    expect(posts[0]?.url).toBe("/blog/example")
  })

  it("serializes nested heading content as plain text", async () => {
    const page = getPage()
    if (!page) {
      throw new Error("Missing post fixture")
    }
    getPage.mockReturnValueOnce({
      ...page,
      data: {
        ...page.data,
        toc: [
          {
            depth: 2,
            title: [
              "Step ",
              1,
              createElement("strong", null, " — ", createElement("em", null, "Deploy")),
              false,
              createPortal("Not in the heading", document.createElement("div")),
            ],
            url: "#deploy",
          },
        ],
      },
    })
    const post = await getBlogPost({ data: "guides/deploy" })
    expect(post.toc).toEqual([{ depth: 2, title: "Step 1 — Deploy", url: "#deploy" }])
    expect(getPage).toHaveBeenLastCalledWith(["guides", "deploy"], "en-US")
  })

  it("returns not found for a missing post", async () => {
    getPage.mockReturnValueOnce(undefined)
    await expect(getBlogPost({ data: "missing" })).rejects.toMatchObject({ isNotFound: true })
  })

  it("returns not found for an unpublished post", async () => {
    const page = getPage()
    if (!page) {
      throw new Error("Missing post fixture")
    }
    getPage.mockReturnValueOnce({ ...page, data: { ...page.data, published: false } })
    await expect(getBlogPost({ data: "draft" })).rejects.toMatchObject({ isNotFound: true })
  })
})
