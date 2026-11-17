import { blog, docs } from "collections/server"
import { loader } from "fumadocs-core/source"
import { toFumadocsSource } from "fumadocs-mdx/runtime/server"

import { i18n } from "~/src/integrations/fumadocs/fumadocs.i18n"
import { docsIcon } from "~/src/integrations/fumadocs/fumadocs.icons"
import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { localizePathname } from "~/src/integrations/use-intl/i18n.paths"

import { formatPostText } from "~/src/lib/post-text"

import { ROUTES } from "~/src/routes"

const WORDS_PER_MINUTE = 220

export const source = loader({
  baseUrl: ROUTES.DOCS,
  i18n,
  icon: docsIcon,
  source: docs.toFumadocsSource(),
})

export const blogSource = loader({
  baseUrl: ROUTES.BLOG,
  i18n,
  source: toFumadocsSource(blog, []),
})

export type BlogPost = ReturnType<typeof blogSource.getPages>[number]

const readingTimeMinutes = async (page: BlogPost, locale: SupportedLocale): Promise<number> => {
  const { structuredData } = await page.data.load()
  const segmenter = new Intl.Segmenter(locale, { granularity: "word" })
  const words = structuredData.contents
    .flatMap(({ content }) => Array.from(segmenter.segment(content), ({ isWordLike }) => isWordLike))
    .filter((isWordLike) => isWordLike === true)

  return Math.max(1, Math.round(words.length / WORDS_PER_MINUTE))
}

export const toBlogPostSummary = async (page: BlogPost, locale: SupportedLocale) => ({
  date: page.data.date,
  featured: page.data.featured === true,
  readingTimeMinutes: await readingTimeMinutes(page, locale),
  summary: page.data.excerpt ?? page.data.description,
  tags: page.data.tags ?? [],
  title: formatPostText({ locale, text: page.data.title }),
  url: localizePathname({ locale, pathname: page.url }),
})

export type BlogPostSummary = Awaited<ReturnType<typeof toBlogPostSummary>>

export const getPublishedBlogPages = (locale: SupportedLocale): BlogPost[] =>
  blogSource
    .getPages(locale)
    .filter((page) => page.data.published)
    .toSorted((first, second) => new Date(second.data.date).getTime() - new Date(first.data.date).getTime())

export const getPublishedBlogPosts = (locale: SupportedLocale): Promise<BlogPostSummary[]> =>
  Promise.all(getPublishedBlogPages(locale).map((page) => toBlogPostSummary(page, locale)))
