import { blog, docs } from "collections/server"
import { loader } from "fumadocs-core/source"
import { lucideIconsPlugin } from "fumadocs-core/source/lucide-icons"
import { toFumadocsSource } from "fumadocs-mdx/runtime/server"

import { i18n } from "~/src/integrations/fumadocs/fumadocs.i18n"
import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { localizePathname } from "~/src/integrations/use-intl/i18n.paths"

import { ROUTES } from "~/src/routes"

const WORDS_PER_MINUTE = 220
const SHORTEST_READ_MINUTES = 1

export const source = loader({
  baseUrl: ROUTES.DOCS,
  i18n,
  plugins: [lucideIconsPlugin()],
  source: docs.toFumadocsSource(),
})

export const blogSource = loader({
  baseUrl: ROUTES.BLOG,
  i18n,
  source: toFumadocsSource(blog, []),
})

export type BlogPost = ReturnType<typeof blogSource.getPages>[number]

const readingTimeMinutes = (page: BlogPost, locale: SupportedLocale): number => {
  const segmenter = new Intl.Segmenter(locale, { granularity: "word" })
  const words = page.data.structuredData.contents
    .flatMap(({ content }) => [...segmenter.segment(content)])
    .filter((segment) => segment.isWordLike === true)

  return Math.max(SHORTEST_READ_MINUTES, Math.round(words.length / WORDS_PER_MINUTE))
}

export const toBlogPostSummary = (page: BlogPost, locale: SupportedLocale) => ({
  date: page.data.date,
  featured: page.data.featured === true,
  readingTimeMinutes: readingTimeMinutes(page, locale),
  summary: page.data.excerpt ?? page.data.description,
  tags: page.data.tags ?? [],
  title: page.data.title,
  url: localizePathname({ locale, pathname: page.url }),
})

export type BlogPostSummary = ReturnType<typeof toBlogPostSummary>

export const getPublishedBlogPosts = (locale: SupportedLocale): BlogPostSummary[] =>
  blogSource
    .getPages(locale)
    .filter((page) => page.data.published)
    .map((page) => toBlogPostSummary(page, locale))
    .toSorted((first, second) => new Date(second.date).getTime() - new Date(first.date).getTime())
