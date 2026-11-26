import { describe, expect, it } from "vite-plus/test"

import { blogArchivePath } from "~/src/integrations/fumadocs/fumadocs.blog"
import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { localizePathname } from "~/src/integrations/use-intl/i18n.paths"

import { BLOG_FEED_TYPE, blogFeedLinks, blogFeedPath, buildBlogFeeds } from "~/src/lib/feed"
import type { PageHead } from "~/src/lib/page-head"

import { APP_NAME, APP_URL } from "~/src/presentation/branding"
import { ROUTES } from "~/src/routes"

const page = (locale: SupportedLocale, pathname: string, head: Partial<PageHead> = {}): PageHead => {
  const canonical = `${APP_URL}${localizePathname({ locale, pathname })}`

  return { alternates: [], canonical, image: `${APP_URL}/images/og.png`, lang: locale, tags: [], title: pathname, ...head }
}

const blogIndexes = I18N.SUPPORTED_LOCALES.map((locale) => page(locale, ROUTES.BLOG.INDEX, { description: "Notes", title: "Blog" }))

const feedFor = (pages: readonly PageHead[], locale: SupportedLocale): string =>
  buildBlogFeeds(pages).find(({ path }) => path === blogFeedPath(locale))?.xml ?? ""

const OLDER = page("en-US", `${ROUTES.BLOG.INDEX}/older`, {
  author: "Ada",
  description: "An older post",
  published: "2026-08-15T00:00:00.000Z",
  tags: ["Testing", "Tooling"],
  title: "Older & wiser",
})

const NEWER = page("en-US", `${ROUTES.BLOG.INDEX}/newer`, {
  description: "A newer post",
  modified: "2026-11-18T00:00:00.000Z",
  published: "2026-11-17T00:00:00.000Z",
  title: "Newer",
})

describe("blog feeds", () => {
  it("writes one feed per locale at the localized feed path", () => {
    expect(buildBlogFeeds(blogIndexes).map(({ path }) => path)).toStrictEqual(
      I18N.SUPPORTED_LOCALES.map((locale) => localizePathname({ locale, pathname: ROUTES.BLOG.FEED })),
    )
    expect(blogFeedPath("de-DE")).toBe(`/de-DE${ROUTES.BLOG.FEED}`)
  })

  it("describes the channel with the blog index of its locale and links to itself", () => {
    const xml = feedFor(blogIndexes, "pl-PL")

    expect(xml).toContain(`<title>Blog – ${APP_NAME}</title>`)
    expect(xml).toContain(`<link>${APP_URL}/pl-PL${ROUTES.BLOG.INDEX}</link>`)
    expect(xml).toContain("<description>Notes</description>")
    expect(xml).toContain("<language>pl-PL</language>")
    expect(xml).toContain(`<atom:link href="${APP_URL}/pl-PL${ROUTES.BLOG.FEED}" rel="self" type="${BLOG_FEED_TYPE}"/>`)
    expect(xml).not.toContain("<item>")
    expect(xml).not.toContain("<lastBuildDate>")
  })

  it("lists the posts of its locale newest first with their publication dates, authors and tags", () => {
    const xml = feedFor(
      [...blogIndexes, OLDER, NEWER, page("de-DE", `${ROUTES.BLOG.INDEX}/fremd`, { published: "2026-11-19T00:00:00.000Z" })],
      "en-US",
    )

    expect(xml.indexOf("<title>Newer</title>")).toBeLessThan(xml.indexOf("<title>Older &amp; wiser</title>"))
    expect(xml).not.toContain("fremd")
    expect(xml).toContain(`<guid isPermaLink="true">${APP_URL}${ROUTES.BLOG.INDEX}/older</guid>`)
    expect(xml).toContain("<pubDate>Sat, 15 Aug 2026 00:00:00 GMT</pubDate>")
    expect(xml).toContain("<pubDate>Tue, 17 Nov 2026 00:00:00 GMT</pubDate>")
    expect(xml).toContain("<dc:creator>Ada</dc:creator>")
    expect(xml).toContain("<category>Testing</category>\n      <category>Tooling</category>")
    expect(xml).toContain("<description>An older post</description>")
    expect(xml).toContain("<lastBuildDate>Wed, 18 Nov 2026 00:00:00 GMT</lastBuildDate>")
    expect(xml.match(/<dc:creator>/gu)).toHaveLength(1)
  })

  it("leaves the later pages of the blog's archive out of the feed", () => {
    const xml = feedFor([...blogIndexes, page("en-US", blogArchivePath(2), { title: "Blog, page 2" })], "en-US")

    expect(xml).not.toContain("<item>")
  })

  it("leaves pages outside the blog out of the feed", () => {
    const xml = feedFor([...blogIndexes, page("en-US", ROUTES.DOCS.INDEX, { published: "2026-11-17T00:00:00.000Z" })], "en-US")

    expect(xml).not.toContain("<item>")
  })

  it("writes an empty description for a channel or post without one", () => {
    const indexes = blogIndexes.map((index) => ({ ...index, description: undefined }))
    const xml = feedFor([...indexes, { ...OLDER, description: undefined }], "en-US")

    expect(xml.match(/<description><\/description>/gu)).toHaveLength(2)
  })

  it("refuses a post it cannot date", () => {
    expect(() => buildBlogFeeds([...blogIndexes, page("en-US", `${ROUTES.BLOG.INDEX}/undated`)])).toThrow(/article:published_time/u)
  })

  it("refuses a locale without a blog index", () => {
    expect(() => buildBlogFeeds(blogIndexes.filter(({ lang }) => lang !== "ja-JP"))).toThrow(/ja-JP blog index/u)
  })
})

describe("blog feed links", () => {
  it("names the feed of the page's locale under the blog's title", () => {
    expect(blogFeedLinks({ locale: "ja-JP", title: "ブログ" })).toStrictEqual([
      { href: `${APP_URL}/ja-JP${ROUTES.BLOG.FEED}`, rel: "alternate", title: `ブログ｜${APP_NAME}`, type: BLOG_FEED_TYPE },
    ])
  })

  it("names no feed before the blog has loaded", () => {
    expect(blogFeedLinks(undefined)).toStrictEqual([])
  })
})
