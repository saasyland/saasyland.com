import { describe, expect, it } from "vite-plus/test"

import { toBlogPostSummary } from "~/src/integrations/fumadocs/fumadocs.blog"
import type { BlogPost } from "~/src/integrations/fumadocs/fumadocs.indexes"

import { BLOG_TAG } from "~/src/data/blog"
import { REPOSITORY_FACTS } from "~/src/data/repository-facts"

const POST: BlogPost = {
  authorName: "Ada",
  date: "2026-09-01",
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
