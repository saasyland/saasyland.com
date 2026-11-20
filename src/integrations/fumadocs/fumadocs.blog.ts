import type { BlogIndex, BlogPost } from "~/src/integrations/fumadocs/fumadocs.indexes"
import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { localizePathname } from "~/src/integrations/use-intl/i18n.paths"

import { formatPostText } from "~/src/lib/post-text"

export const toBlogPostSummary = (post: BlogPost, locale: SupportedLocale) => ({
  date: post.date,
  featured: post.featured,
  readingTimeMinutes: post.readingTimeMinutes,
  summary: post.summary,
  tags: post.tags,
  title: formatPostText({ locale, text: post.title }),
  url: localizePathname({ locale, pathname: post.url }),
})

export type BlogPostSummary = ReturnType<typeof toBlogPostSummary>

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
