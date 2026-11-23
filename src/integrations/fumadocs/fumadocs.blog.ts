import type { BlogIndex, BlogPost } from "~/src/integrations/fumadocs/fumadocs.indexes"
import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { localizePathname } from "~/src/integrations/use-intl/i18n.paths"

import { BLOG_ARCHIVE, BLOG_HIGHLIGHTS, FEATURED_BLOG_POSTS } from "~/src/data/blog"

import { formatPostText } from "~/src/lib/post-text"
import type { PageSequence } from "~/src/lib/seo"

import * as ROUTES from "~/src/routes"

export const toBlogPostSummary = (post: BlogPost, locale: SupportedLocale) => ({
  date: post.date,
  image: post.image,
  readingTimeMinutes: post.readingTimeMinutes,
  summary: post.summary,
  tags: post.tags,
  title: formatPostText({ locale, text: post.title }),
  updated: post.updated,
  url: localizePathname({ locale, pathname: post.url }),
})

export type BlogPostSummary = ReturnType<typeof toBlogPostSummary>

export const toBlogPostLink = (post: BlogPost, locale: SupportedLocale) => ({
  title: formatPostText({ locale, text: post.title }),
  url: localizePathname({ locale, pathname: post.url }),
})

const RELATED_POSTS = 3

export const relatedBlogPosts = ({
  locale,
  post,
  posts,
}: {
  locale: SupportedLocale
  post: BlogPost
  posts: BlogIndex
}): BlogPostSummary[] => {
  const tags = new Set(post.tags)
  const sharedTags = (other: BlogPost): number => other.tags.filter((tag) => tags.has(tag)).length

  return posts
    .filter((other) => other.url !== post.url)
    .toSorted((first, second) => sharedTags(second) - sharedTags(first))
    .slice(0, RELATED_POSTS)
    .map((other) => toBlogPostSummary(other, locale))
}

export const featuredBlogPosts = (posts: BlogIndex): BlogIndex =>
  FEATURED_BLOG_POSTS.flatMap((slug) => posts.filter(({ url }) => url === `${ROUTES.BLOG}/${slug}`))

export const blogNotes = (posts: BlogIndex) => {
  const lead = featuredBlogPosts(posts).at(0) ?? posts.at(0)

  return { latest: posts.filter((post) => post !== lead).slice(0, BLOG_HIGHLIGHTS.LATEST), lead }
}

const lastChange = ({ date, updated = date }: Pick<BlogPost, "date" | "updated">): number => new Date(updated).getTime()

const isRevised = (post: Pick<BlogPost, "date" | "updated">): boolean => lastChange(post) > new Date(post.date).getTime()

export const blogHighlights = (posts: BlogIndex) => {
  const featured = featuredBlogPosts(posts)
  const shown = new Set(featured.map(({ url }) => url))
  const latest = posts.filter(({ url }) => !shown.has(url)).slice(0, BLOG_HIGHLIGHTS.LATEST)
  for (const { url } of latest) {
    shown.add(url)
  }
  const updated = posts
    .filter((post) => !shown.has(post.url) && isRevised(post))
    .toSorted((first, second) => lastChange(second) - lastChange(first))
    .slice(0, BLOG_HIGHLIGHTS.UPDATED)

  return { featured, latest, updated }
}

export const blogArchivePageCount = (posts: number): number => Math.max(BLOG_ARCHIVE.FIRST_PAGE, Math.ceil(posts / BLOG_ARCHIVE.PAGE_SIZE))

export const blogArchivePath = (page: number): string =>
  page > BLOG_ARCHIVE.FIRST_PAGE ? `${ROUTES.BLOG}/${BLOG_ARCHIVE.PAGE_SEGMENT}/${String(page)}` : ROUTES.BLOG

export const blogArchivePage = <TPost>(posts: readonly TPost[], page: number): TPost[] =>
  posts.slice((page - BLOG_ARCHIVE.FIRST_PAGE) * BLOG_ARCHIVE.PAGE_SIZE, page * BLOG_ARCHIVE.PAGE_SIZE)

export const blogArchiveSequence = ({ page, pages }: { page: number; pages: number }): PageSequence => ({
  ...(page < pages && { next: blogArchivePath(page + 1) }),
  ...(page > BLOG_ARCHIVE.FIRST_PAGE && { previous: blogArchivePath(page - 1) }),
})
