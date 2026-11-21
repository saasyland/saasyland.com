import { describe, expect, it } from "vite-plus/test"

import type { BlogPostSummary } from "~/src/integrations/fumadocs/fumadocs.blog"

import { BLOG_SORT, BLOG_TAG, type BlogTag } from "~/src/data/blog"

import { countBlogTags, filterBlogPosts, normalizeSearchText, searchTerms, sortBlogPosts } from "~/src/lib/blog-archive"

const post = (title: string, fields: Partial<BlogPostSummary> = {}): BlogPostSummary => ({
  date: "2026-08-15",
  image: undefined,
  readingTimeMinutes: 10,
  summary: undefined,
  tags: [],
  title,
  updated: undefined,
  url: `/blog/${title}`,
  ...fields,
})

const LABELS: Record<BlogTag, string> = {
  [BLOG_TAG.AI_AGENTS]: "KI-Agenten",
  [BLOG_TAG.ARCHITECTURE]: "Architektur",
  [BLOG_TAG.AUTH]: "Authentifizierung",
  [BLOG_TAG.BOILERPLATE]: "Boilerplate",
  [BLOG_TAG.COMPARISON]: "Vergleich",
  [BLOG_TAG.NEXTJS]: "Next.js",
  [BLOG_TAG.PAYMENTS]: "Zahlungen",
  [BLOG_TAG.RELEASE]: "Release",
  [BLOG_TAG.SAAS]: "SaaS",
  [BLOG_TAG.SECURITY]: "Sicherheit",
  [BLOG_TAG.STACK]: "Stack",
  [BLOG_TAG.TANSTACK_START]: "TanStack Start",
  [BLOG_TAG.TESTING]: "Tests",
  [BLOG_TAG.TOOLING]: "Werkzeuge",
  [BLOG_TAG.TYPESCRIPT]: "TypeScript",
}

const label = (tag: BlogTag): string => LABELS[tag]

const titles = (posts: readonly BlogPostSummary[]): string[] => posts.map(({ title }) => title)

describe("search text", () => {
  it("drops accents and case, and keeps Japanese voicing marks", () => {
    expect(normalizeSearchText({ locale: "fr-FR", text: "Sécurité ÉLÉMENTAIRE" })).toBe("securite elementaire")
    expect(normalizeSearchText({ locale: "ja-JP", text: "ガイド" })).toBe("ガイド".normalize("NFKD"))
    expect(normalizeSearchText({ locale: "en-US", text: "ＴａｎＳｔａｃｋ" })).toBe("tanstack")
  })

  it("splits a query into its words", () => {
    expect(searchTerms({ locale: "en-US", query: "  Better   Auth " })).toStrictEqual(["better", "auth"])
    expect(searchTerms({ locale: "en-US", query: "   " })).toStrictEqual([])
  })
})

describe("filtering posts", () => {
  const POSTS = [
    post("Better Auth vs Clerk", { summary: "Who owns the user table", tags: [BLOG_TAG.AUTH] }),
    post("Polar vs Stripe", { summary: "Merchant of record", tags: [BLOG_TAG.PAYMENTS, BLOG_TAG.SAAS] }),
    post("Sicherheit ohne Nonces", { tags: [BLOG_TAG.SECURITY] }),
  ]

  it("keeps every post for an empty query and no topic", () => {
    expect(titles(filterBlogPosts({ label, locale: "de-DE", posts: POSTS, query: "", tag: undefined }))).toStrictEqual(titles(POSTS))
  })

  it("matches every word of the query against the title, the summary and the topics in both forms", () => {
    expect(titles(filterBlogPosts({ label, locale: "de-DE", posts: POSTS, query: "user CLERK", tag: undefined }))).toStrictEqual([
      "Better Auth vs Clerk",
    ])
    expect(titles(filterBlogPosts({ label, locale: "de-DE", posts: POSTS, query: "zahlungen", tag: undefined }))).toStrictEqual([
      "Polar vs Stripe",
    ])
    expect(titles(filterBlogPosts({ label, locale: "de-DE", posts: POSTS, query: "payments", tag: undefined }))).toStrictEqual([
      "Polar vs Stripe",
    ])
    expect(titles(filterBlogPosts({ label, locale: "de-DE", posts: POSTS, query: "stripe clerk", tag: undefined }))).toStrictEqual([])
  })

  it("keeps only the posts of the chosen topic", () => {
    expect(titles(filterBlogPosts({ label, locale: "de-DE", posts: POSTS, query: "", tag: BLOG_TAG.SAAS }))).toStrictEqual([
      "Polar vs Stripe",
    ])
    expect(titles(filterBlogPosts({ label, locale: "de-DE", posts: POSTS, query: "auth", tag: BLOG_TAG.SAAS }))).toStrictEqual([])
  })
})

describe("sorting posts", () => {
  const POSTS = [
    post("old-long", { date: "2026-01-01", readingTimeMinutes: 30 }),
    post("new-short", { date: "2026-11-01", readingTimeMinutes: 5 }),
    post("mid-revised", { date: "2026-05-01", readingTimeMinutes: 5, updated: "2026-11-15" }),
    post("old-revised-same-day", { date: "2026-02-01", readingTimeMinutes: 12, updated: "2026-11-15" }),
  ]

  it("puts the newest publication first", () => {
    expect(titles(sortBlogPosts(POSTS, BLOG_SORT.NEWEST))).toStrictEqual(["new-short", "mid-revised", "old-revised-same-day", "old-long"])
  })

  it("puts the latest change first, the newer publication first among equals", () => {
    expect(titles(sortBlogPosts(POSTS, BLOG_SORT.UPDATED))).toStrictEqual(["mid-revised", "old-revised-same-day", "new-short", "old-long"])
  })

  it("puts the shortest read first, the newer publication first among equals", () => {
    expect(titles(sortBlogPosts(POSTS, BLOG_SORT.READING_TIME))).toStrictEqual([
      "new-short",
      "mid-revised",
      "old-revised-same-day",
      "old-long",
    ])
  })

  it("leaves the input in place", () => {
    sortBlogPosts(POSTS, BLOG_SORT.READING_TIME)

    expect(titles(POSTS)).toStrictEqual(["old-long", "new-short", "mid-revised", "old-revised-same-day"])
  })
})

describe("topic counts", () => {
  it("counts the posts of each topic in the order of BLOG_TAGS, leaving out topics without posts", () => {
    const posts = [post("a", { tags: [BLOG_TAG.TESTING, BLOG_TAG.AUTH] }), post("b", { tags: [BLOG_TAG.AUTH] })]

    expect(countBlogTags(posts)).toStrictEqual([
      [BLOG_TAG.AUTH, 2],
      [BLOG_TAG.TESTING, 1],
    ])
  })
})
