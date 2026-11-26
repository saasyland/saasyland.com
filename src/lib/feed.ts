import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { deLocalizePathname, localizePathname } from "~/src/integrations/use-intl/i18n.paths"

import { BLOG_ARCHIVE } from "~/src/data/blog"

import type { PageHead } from "~/src/lib/page-head"
import { buildTitle } from "~/src/lib/seo"
import { escapeXml } from "~/src/lib/sitemap"

import { APP_URL } from "~/src/presentation/branding"
import { ROUTES } from "~/src/routes"

export const BLOG_FEED_TYPE = "application/rss+xml"

const ATOM_NAMESPACE = "http://www.w3.org/2005/Atom"
const DUBLIN_CORE_NAMESPACE = "http://purl.org/dc/elements/1.1/"
const POST_PREFIX = `${ROUTES.BLOG.INDEX}/`
const ARCHIVE_PREFIX = `${POST_PREFIX}${BLOG_ARCHIVE.PAGE_SEGMENT}/`

export interface BlogFeed {
  readonly path: string
  readonly xml: string
}

type FeedPost = PageHead & { readonly published: string }

export const blogFeedPath = (locale: SupportedLocale): string => localizePathname({ locale, pathname: ROUTES.BLOG.FEED })

export const blogFeedLinks = (blog: { readonly locale: SupportedLocale; readonly title: string } | undefined) => {
  if (blog === undefined) {
    return []
  }

  const { locale, title } = blog

  return [{ href: `${APP_URL}${blogFeedPath(locale)}`, rel: "alternate", title: buildTitle({ locale, title }), type: BLOG_FEED_TYPE }]
}

const pathOf = ({ canonical }: Pick<PageHead, "canonical">): string => deLocalizePathname(new URL(canonical).pathname)

const toFeedPost = (page: PageHead): FeedPost => {
  const { published } = page

  if (published === undefined) {
    throw new Error(`${page.canonical} is a blog post without an article:published_time, so the feed cannot date it.`)
  }

  return { ...page, published }
}

const toRfc822 = (date: string): string => new Date(date).toUTCString()

const itemXml = (post: FeedPost): string =>
  [
    "    <item>",
    `      <title>${escapeXml(post.title)}</title>`,
    `      <link>${escapeXml(post.canonical)}</link>`,
    `      <guid isPermaLink="true">${escapeXml(post.canonical)}</guid>`,
    `      <pubDate>${toRfc822(post.published)}</pubDate>`,
    ...(post.author === undefined ? [] : [`      <dc:creator>${escapeXml(post.author)}</dc:creator>`]),
    ...post.tags.map((tag) => `      <category>${escapeXml(tag)}</category>`),
    `      <description>${escapeXml(post.description ?? "")}</description>`,
    "    </item>",
  ].join("\n")

const buildFeed = ({ index, locale, posts }: { index: PageHead; locale: SupportedLocale; posts: readonly FeedPost[] }): string => {
  const newest = posts
    .map((post) => post.modified ?? post.published)
    .toSorted((first, second) => second.localeCompare(first))
    .at(0)

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<rss version="2.0" xmlns:atom="${ATOM_NAMESPACE}" xmlns:dc="${DUBLIN_CORE_NAMESPACE}">`,
    "  <channel>",
    `    <title>${escapeXml(buildTitle({ locale, title: index.title }))}</title>`,
    `    <link>${escapeXml(index.canonical)}</link>`,
    `    <description>${escapeXml(index.description ?? "")}</description>`,
    `    <language>${locale}</language>`,
    `    <atom:link href="${escapeXml(`${APP_URL}${blogFeedPath(locale)}`)}" rel="self" type="${BLOG_FEED_TYPE}"/>`,
    ...(newest === undefined ? [] : [`    <lastBuildDate>${toRfc822(newest)}</lastBuildDate>`]),
    ...posts.toSorted((first, second) => second.published.localeCompare(first.published)).map((post) => itemXml(post)),
    "  </channel>",
    "</rss>",
    "",
  ].join("\n")
}

export const buildBlogFeeds = (pages: readonly PageHead[]): BlogFeed[] =>
  I18N.SUPPORTED_LOCALES.map((locale) => {
    const own = pages.filter(({ lang }) => lang === locale)
    const index = own.find((page) => pathOf(page) === ROUTES.BLOG.INDEX)

    if (index === undefined) {
      throw new Error(`No ${locale} blog index is listed, so its blog feed would have no channel.`)
    }

    const posts = own
      .filter((page) => pathOf(page).startsWith(POST_PREFIX) && !pathOf(page).startsWith(ARCHIVE_PREFIX))
      .map((page) => toFeedPost(page))

    return { path: blogFeedPath(locale), xml: buildFeed({ index, locale, posts }) }
  })
