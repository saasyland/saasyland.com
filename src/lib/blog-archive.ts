import type { BlogPostSummary } from "~/src/integrations/fumadocs/fumadocs.blog"
import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { BLOG_SORT, BLOG_TAGS, type BlogAuthor, type BlogSort, type BlogTag } from "~/src/data/blog"

import { ROUTES } from "~/src/routes"

export const blogAuthorPath = (author: BlogAuthor): string => `${ROUTES.AUTHORS}/${author}`

type ArchivePost = Pick<BlogPostSummary, "date" | "readingTimeMinutes" | "summary" | "tags" | "title" | "updated">

type Comparator = (first: ArchivePost, second: ArchivePost) => number

const LATIN_DIACRITICS = /[̀-ͯ]/gu
const WHITESPACE = /\s+/u

const time = (date: string): number => new Date(date).getTime()

const byNewest: Comparator = (first, second) => time(second.date) - time(first.date)

const byLastChange: Comparator = (first, second) => time(second.updated ?? second.date) - time(first.updated ?? first.date)

const byReadingTime: Comparator = (first, second) => first.readingTimeMinutes - second.readingTimeMinutes

const COMPARATORS: Record<BlogSort, readonly Comparator[]> = {
  [BLOG_SORT.NEWEST]: [byNewest],
  [BLOG_SORT.READING_TIME]: [byReadingTime, byNewest],
  [BLOG_SORT.UPDATED]: [byLastChange, byNewest],
}

export const normalizeSearchText = ({ locale, text }: { locale: SupportedLocale; text: string }): string =>
  text.normalize("NFKD").replaceAll(LATIN_DIACRITICS, "").toLocaleLowerCase(locale)

export const searchTerms = ({ locale, query }: { locale: SupportedLocale; query: string }): string[] =>
  normalizeSearchText({ locale, text: query })
    .split(WHITESPACE)
    .filter((term) => term.length > 0)

export const sortBlogPosts = <TPost extends ArchivePost>(posts: readonly TPost[], sort: BlogSort): TPost[] =>
  posts.toSorted((first, second) => COMPARATORS[sort].reduce((order, compare) => (order === 0 ? compare(first, second) : order), 0))

export const filterBlogPosts = <TPost extends ArchivePost>({
  label,
  locale,
  posts,
  query,
  tag,
}: {
  label: (tag: BlogTag) => string
  locale: SupportedLocale
  posts: readonly TPost[]
  query: string
  tag: BlogTag | undefined
}): TPost[] => {
  const terms = searchTerms({ locale, query })

  return posts.filter((post) => {
    const text = normalizeSearchText({
      locale,
      text: [post.title, post.summary ?? "", ...post.tags, ...post.tags.map((postTag) => label(postTag))].join(" "),
    })

    return (tag === undefined || post.tags.includes(tag)) && terms.every((term) => text.includes(term))
  })
}

export const countBlogTags = (posts: readonly Pick<ArchivePost, "tags">[]): [BlogTag, number][] =>
  BLOG_TAGS.map((tag): [BlogTag, number] => [tag, posts.filter(({ tags }) => tags.includes(tag)).length])
    .filter(([, count]) => count > 0)
    .toSorted(([, first], [, second]) => second - first)
