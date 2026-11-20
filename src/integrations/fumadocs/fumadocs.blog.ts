import type { BlogPost } from "~/src/integrations/fumadocs/fumadocs.indexes"
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
