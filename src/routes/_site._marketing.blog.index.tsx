import type { JSX } from "react"

import { createFileRoute, stripSearchParams } from "@tanstack/react-router"
import { Rss } from "lucide-react"
import { useTranslations } from "use-intl/react"
import { loadBlogIndex } from "virtual:content-indexes"
import * as zod from "zod"

import { MotionProvider } from "~/src/providers/motion-provider"

import {
  blogArchivePage,
  blogArchivePageCount,
  blogArchiveSequence,
  blogHighlights,
  toBlogPostSummary,
} from "~/src/integrations/fumadocs/fumadocs.blog"
import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { BLOG_ARCHIVE, BLOG_SORT, BLOG_SORTS, BLOG_TAGS } from "~/src/data/blog"

import { BLOG_FEED, blogFeedPath } from "~/src/lib/feed"
import { searchChoice, searchParam, searchText } from "~/src/lib/search-params"
import { type PageLoaderData, buildBlogStructuredDataHtml, buildPageHead } from "~/src/lib/seo"

import { BlogIndexPending } from "~/src/presentation/components/custom/blog/blog-pending"
import { FeaturedPosts } from "~/src/presentation/components/custom/blog/featured-posts"
import { PostArchive } from "~/src/presentation/components/custom/blog/post-archive"
import { PostFinderLayout } from "~/src/presentation/components/custom/blog/post-finder"
import { RecentPosts } from "~/src/presentation/components/custom/blog/recent-posts"
import { ContentPage } from "~/src/presentation/components/custom/content-page"

import { ROUTES } from "~/src/routes"

const BlogIndexPage = (): JSX.Element => {
  const t = useTranslations("pages.blog")

  const { locale, metadata, posts } = Route.useLoaderData()

  const structuredDataHtml = buildBlogStructuredDataHtml({
    description: metadata.description,
    listed: blogArchivePage(posts, BLOG_ARCHIVE.FIRST_PAGE),
    locale,
    offset: 0,
    pathname: ROUTES.BLOG,
    posts,
    title: metadata.title,
    total: posts.length,
  })

  return (
    <ContentPage lead={t("index.description")} title={t("index.title")}>
      <script dangerouslySetInnerHTML={structuredDataHtml} type="application/ld+json" />
      <a
        className="mt-6 inline-flex items-center gap-2 rounded-sm py-1.5 text-label text-muted-foreground uppercase transition-colors duration-200 ease-exp hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        href={blogFeedPath(locale)}
        type={BLOG_FEED.TYPE}
      >
        <Rss aria-hidden className="size-3.5" strokeWidth={1.75} />
        {t("index.feed")}
      </a>

      {posts.length === 0 && (
        <p className="mt-10 border-y border-border py-10 text-body text-muted-foreground md:mt-14">{t("index.empty")}</p>
      )}

      {posts.length > 0 && (
        <PostFinderLayout locale={locale} posts={posts}>
          <div className="flex flex-col gap-20 md:gap-28">
            <FeaturedPosts />
            <RecentPosts />
            <MotionProvider>
              <PostArchive />
            </MotionProvider>
          </div>
        </PostFinderLayout>
      )}
    </ContentPage>
  )
}

const NAMESPACE = "pages.blog"

const SEARCH_DEFAULTS = { sort: BLOG_SORT.NEWEST } as const

const LOADED_PAGES = zod
  .number()
  .int()
  .min(BLOG_ARCHIVE.FIRST_PAGE + 1)

const TOPIC = zod.enum(BLOG_TAGS)

type BlogIndexLoaderData = PageLoaderData & { readonly pages: number }

export const Route = createFileRoute("/_site/_marketing/blog/")({
  validateSearch: zod.object({
    page: searchParam(LOADED_PAGES),
    q: searchText(),
    sort: searchChoice(BLOG_SORTS, SEARCH_DEFAULTS.sort),
    tag: searchParam(TOPIC),
  }),
  component: BlogIndexPage,
  head: ({ loaderData }: { loaderData?: BlogIndexLoaderData | undefined }) =>
    buildPageHead({
      ...loaderData?.metadata,
      locale: loaderData?.locale,
      pathname: ROUTES.BLOG,
      sequence: blogArchiveSequence({ page: BLOG_ARCHIVE.FIRST_PAGE, pages: loaderData?.pages ?? BLOG_ARCHIVE.FIRST_PAGE }),
    }),
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    const [metadata, index] = await Promise.all([
      loadPageMetadata({ locale, namespace: NAMESPACE }),
      loadBlogIndex(locale),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
    ])
    const { featured, latest, updated } = blogHighlights(index)
    const summarize = (posts: typeof index) => posts.map((post) => toBlogPostSummary(post, locale))

    return {
      featured: summarize(featured),
      latest: summarize(latest),
      locale,
      metadata,
      pages: blogArchivePageCount(index.length),
      posts: summarize(index),
      updated: summarize(updated),
    }
  },
  pendingComponent: BlogIndexPending,
  search: { middlewares: [stripSearchParams(SEARCH_DEFAULTS)] },
  staticData: { namespaces: [NAMESPACE] },
})
