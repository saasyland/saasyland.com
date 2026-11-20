import { describe, expect, it } from "vite-plus/test"

import { relatedBlogPosts, toBlogPostSummary } from "~/src/integrations/fumadocs/fumadocs.blog"
import type { BlogPost } from "~/src/integrations/fumadocs/fumadocs.indexes"

import { BLOG_TAG } from "~/src/data/blog"
import { REPOSITORY_FACTS } from "~/src/data/repository-facts"

const POST: BlogPost = {
  authorImage: undefined,
  authorName: "Ada",
  authorUrl: undefined,
  date: "2026-09-01",
  description: undefined,
  faq: undefined,
  featured: true,
  image: undefined,
  path: "release.pl-PL.mdx",
  readingTimeMinutes: 7,
  summary: "Summary",
  tags: [BLOG_TAG.RELEASE],
  title: "Coverage gate of {coverageThreshold, number}%",
  toc: [],
  updated: undefined,
  url: "/blog/release",
}

describe("blog post summary", () => {
  it("formats the title with the repository's values and localizes the url", () => {
    expect(toBlogPostSummary(POST, "pl-PL")).toStrictEqual({
      date: "2026-09-01",
      featured: true,
      readingTimeMinutes: 7,
      summary: "Summary",
      tags: [BLOG_TAG.RELEASE],
      title: `Coverage gate of ${String(REPOSITORY_FACTS.coverageThreshold)}%`,
      url: "/pl-PL/blog/release",
    })
  })

  it("keeps the url of a post in the default locale", () => {
    expect(toBlogPostSummary(POST, "en-US").url).toBe("/blog/release")
  })
})

const post = (slug: string, tags: BlogPost["tags"]): BlogPost => ({ ...POST, tags, title: slug, url: `/blog/${slug}` })

describe("related blog posts", () => {
  const POSTS = [
    post("newest", [BLOG_TAG.TESTING]),
    post("current", [BLOG_TAG.RELEASE, BLOG_TAG.TOOLING]),
    post("one-shared", [BLOG_TAG.TOOLING]),
    post("both-shared", [BLOG_TAG.RELEASE, BLOG_TAG.TOOLING]),
    post("unrelated", [BLOG_TAG.SAAS]),
    post("oldest-shared", [BLOG_TAG.RELEASE]),
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
