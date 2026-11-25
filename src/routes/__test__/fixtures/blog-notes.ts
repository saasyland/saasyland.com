import type { BlogPostSummary } from "~/src/integrations/fumadocs/fumadocs.blog"

import { BLOG_TAG } from "~/src/data/blog"

export interface LandingNotes {
  readonly latest: BlogPostSummary[]
  readonly lead: BlogPostSummary | undefined
}

export const noteSummary = (title: string, slug: string): BlogPostSummary => ({
  date: "2026-09-01",
  image: undefined,
  readingTimeMinutes: 5,
  summary: "Article summary",
  tags: [BLOG_TAG.TANSTACK_START],
  title,
  updated: undefined,
  url: `/blog/${slug}`,
})

export const NOTES: readonly BlogPostSummary[] = [
  noteSummary("Featured", "featured"),
  noteSummary("Recent", "recent"),
  noteSummary("Older", "older"),
]

export const landingNotes = (posts: readonly BlogPostSummary[]): LandingNotes => ({ latest: posts.slice(1), lead: posts.at(0) })
