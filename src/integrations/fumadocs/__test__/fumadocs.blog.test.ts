import { describe, expect, it } from "vite-plus/test"

import {
  blogArchivePage,
  blogArchivePageCount,
  blogArchivePath,
  blogArchiveSequence,
  blogHighlights,
  blogNotes,
  featuredBlogPosts,
  relatedBlogPosts,
  toBlogPostLink,
  toBlogPostSummary,
} from "~/src/integrations/fumadocs/fumadocs.blog"
import type { BlogPost } from "~/src/integrations/fumadocs/fumadocs.indexes"

import { BLOG_ARCHIVE, BLOG_AUTHOR, BLOG_HIGHLIGHTS, BLOG_TAG, FEATURED_BLOG_POSTS } from "~/src/data/blog"
import { REPOSITORY_FACTS } from "~/src/data/repository-facts"

import { ROUTES } from "~/src/routes"

const POST: BlogPost = {
  author: BLOG_AUTHOR.PIOTR_BOROWIECKI,
  date: "2026-09-01",
  description: undefined,
  faq: undefined,
  image: "/images/blog/release.webp",
  path: "release.pl-PL.mdx",
  readingTimeMinutes: 7,
  summary: "Summary",
  tags: [BLOG_TAG.RELEASE],
  title: "Coverage gate of {coverageThreshold, number}%",
  toc: [],
  updated: "2026-10-01",
  url: "/blog/release",
}

const [FIRST_FEATURED, SECOND_FEATURED] = FEATURED_BLOG_POSTS

describe("blog post summary", () => {
  it("formats the title with the repository's values and localizes the url", () => {
    expect(toBlogPostSummary(POST, "pl-PL")).toStrictEqual({
      date: "2026-09-01",
      image: "/images/blog/release.webp",
      readingTimeMinutes: 7,
      summary: "Summary",
      tags: [BLOG_TAG.RELEASE],
      title: `Coverage gate of ${String(REPOSITORY_FACTS.coverageThreshold)}%`,
      updated: "2026-10-01",
      url: "/pl-PL/blog/release",
    })
  })

  it("keeps the url of a post in the default locale", () => {
    expect(toBlogPostSummary(POST, "en-US").url).toBe("/blog/release")
  })

  it("links a post by its formatted title and localized url alone", () => {
    expect(toBlogPostLink(POST, "de-DE")).toStrictEqual({
      title: `Coverage gate of ${String(REPOSITORY_FACTS.coverageThreshold)}%`,
      url: "/de-DE/blog/release",
    })
  })
})

const post = (slug: string, fields: Partial<BlogPost> = {}): BlogPost => ({
  ...POST,
  title: slug,
  updated: undefined,
  url: `/blog/${slug}`,
  ...fields,
})

describe("related blog posts", () => {
  const POSTS = [
    post("newest", { tags: [BLOG_TAG.TESTING] }),
    post("current", { tags: [BLOG_TAG.RELEASE, BLOG_TAG.TOOLING] }),
    post("one-shared", { tags: [BLOG_TAG.TOOLING] }),
    post("both-shared", { tags: [BLOG_TAG.RELEASE, BLOG_TAG.TOOLING] }),
    post("unrelated", { tags: [BLOG_TAG.SAAS] }),
    post("oldest-shared", { tags: [BLOG_TAG.RELEASE] }),
  ]

  it("picks the posts that share the most tags, the newer first among equals, without the post itself", () => {
    const [, current] = POSTS
    if (current === undefined) {
      throw new Error("Missing post")
    }

    expect(relatedBlogPosts({ locale: "de-DE", post: current, posts: POSTS }).map(({ url }) => url)).toStrictEqual([
      "/de-DE/blog/both-shared",
      "/de-DE/blog/one-shared",
      "/de-DE/blog/oldest-shared",
    ])
  })
})

describe("featured blog posts", () => {
  it("picks the posts FEATURED_BLOG_POSTS names, in its order, and skips a name the locale does not have", () => {
    const posts = [post("newest"), post(SECOND_FEATURED), post(FIRST_FEATURED)]

    expect(featuredBlogPosts(posts).map(({ url }) => url)).toStrictEqual([
      `${ROUTES.BLOG}/${FIRST_FEATURED}`,
      `${ROUTES.BLOG}/${SECOND_FEATURED}`,
    ])
  })
})

describe("blog highlights", () => {
  it("keeps the featured posts, then the newest others, then the most recently revised of the rest", () => {
    const posts = [
      post("one", { date: "2026-11-20" }),
      post(FIRST_FEATURED, { date: "2026-11-19" }),
      post("two", { date: "2026-11-18" }),
      post("three", { date: "2026-11-17" }),
      post("four", { date: "2026-11-16" }),
      post("revised-early", { date: "2026-08-01", updated: "2026-09-01" }),
      post("unchanged", { date: "2026-08-01", updated: "2026-08-01" }),
      post("revised-late", { date: "2026-07-01", updated: "2026-11-01" }),
      post("never-updated", { date: "2026-06-01" }),
    ]

    const { featured, latest, updated } = blogHighlights(posts)

    expect(featured.map(({ title }) => title)).toStrictEqual([FIRST_FEATURED])
    expect(latest.map(({ title }) => title)).toStrictEqual(["one", "two", "three"].slice(0, BLOG_HIGHLIGHTS.LATEST))
    expect(updated.map(({ title }) => title)).toStrictEqual(["revised-late", "revised-early"])
  })
})

describe("landing notes", () => {
  it("leads with the first featured post and lists the newest others", () => {
    const posts = [post("one"), post("two"), post(FIRST_FEATURED), post("three"), post("four")]

    const { latest, lead } = blogNotes(posts)

    expect(lead?.title).toBe(FIRST_FEATURED)
    expect(latest.map(({ title }) => title)).toStrictEqual(["one", "two", "three"].slice(0, BLOG_HIGHLIGHTS.LATEST))
  })

  it("leads with the newest post when none is featured, and with nothing when there is no post", () => {
    expect(blogNotes([post("one"), post("two")]).lead?.title).toBe("one")
    expect(blogNotes([])).toStrictEqual({ latest: [], lead: undefined })
  })
})

describe("blog archive pages", () => {
  it("counts at least one page, and one more for every started page of posts", () => {
    expect(blogArchivePageCount(0)).toBe(BLOG_ARCHIVE.FIRST_PAGE)
    expect(blogArchivePageCount(BLOG_ARCHIVE.PAGE_SIZE)).toBe(1)
    expect(blogArchivePageCount(BLOG_ARCHIVE.PAGE_SIZE + 1)).toBe(2)
  })

  it("puts the first page at the blog itself and every other page under its number", () => {
    expect(blogArchivePath(BLOG_ARCHIVE.FIRST_PAGE)).toBe(ROUTES.BLOG)
    expect(blogArchivePath(3)).toBe(`${ROUTES.BLOG}/${BLOG_ARCHIVE.PAGE_SEGMENT}/3`)
  })

  it("slices the posts of one page", () => {
    const posts = Array.from({ length: BLOG_ARCHIVE.PAGE_SIZE + 2 }, (_, index) => index)

    expect(blogArchivePage(posts, 1)).toHaveLength(BLOG_ARCHIVE.PAGE_SIZE)
    expect(blogArchivePage(posts, 2)).toStrictEqual([BLOG_ARCHIVE.PAGE_SIZE, BLOG_ARCHIVE.PAGE_SIZE + 1])
  })

  it("names the previous and next pages where they exist", () => {
    expect(blogArchiveSequence({ page: 1, pages: 1 })).toStrictEqual({})
    expect(blogArchiveSequence({ page: 1, pages: 3 })).toStrictEqual({ next: blogArchivePath(2) })
    expect(blogArchiveSequence({ page: 2, pages: 3 })).toStrictEqual({ next: blogArchivePath(3), previous: ROUTES.BLOG })
    expect(blogArchiveSequence({ page: 3, pages: 3 })).toStrictEqual({ previous: blogArchivePath(2) })
  })
})
