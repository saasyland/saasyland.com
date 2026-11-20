import type { JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { Rss } from "lucide-react"
import { useTranslations } from "use-intl/react"
import { loadBlogIndex } from "virtual:content-indexes"

import { MotionProvider } from "~/src/providers/motion-provider"

import { toBlogPostSummary } from "~/src/integrations/fumadocs/fumadocs.blog"
import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { BLOG_FEED, blogFeedPath } from "~/src/lib/feed"
import { buildBlogStructuredDataHtml, pageHead } from "~/src/lib/seo"

import { BlogIndexPending } from "~/src/presentation/components/custom/blog/blog-pending"
import { PostRow } from "~/src/presentation/components/custom/blog/post-row"
import { ContentPage } from "~/src/presentation/components/custom/content-page"
import { HighlightGroup } from "~/src/presentation/components/custom/highlight"

import { ROUTES } from "~/src/routes"

const BlogIndexPage = (): JSX.Element => {
  const t = useTranslations("pages.blog")

  const { locale, metadata, posts } = Route.useLoaderData()

  const POSTS_EXIST = posts.length > 0
  const structuredDataHtml = buildBlogStructuredDataHtml({ description: metadata.description, locale, posts, title: metadata.title })

  return (
    <ContentPage lead={t("index.description")} title={t("index.title")}>
      <script dangerouslySetInnerHTML={structuredDataHtml} type="application/ld+json" />
      <a
        className="mt-6 inline-flex items-center gap-2 rounded-sm py-1.5 font-mono text-label text-muted-foreground uppercase transition-colors duration-200 ease-exp hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        href={blogFeedPath(locale)}
        type={BLOG_FEED.TYPE}
      >
        <Rss aria-hidden className="size-3.5" strokeWidth={1.75} />
        {t("index.feed")}
      </a>
      <div className="mt-10 md:mt-14">
        {!POSTS_EXIST && <p className="border-y border-border py-10 text-body text-muted-foreground">{t("index.empty")}</p>}

        {POSTS_EXIST && (
          <MotionProvider>
            <HighlightGroup className="-mx-4 divide-y divide-border border-y border-border md:-mx-6" name="blog-highlight">
              {posts.map((post) => (
                <PostRow key={post.url} post={post} />
              ))}
            </HighlightGroup>
          </MotionProvider>
        )}
      </div>
    </ContentPage>
  )
}

const NAMESPACE = "pages.blog"

export const Route = createFileRoute("/_site/_marketing/blog/")({
  component: BlogIndexPage,
  head: pageHead(ROUTES.BLOG),
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    const [metadata, posts] = await Promise.all([
      loadPageMetadata({ locale, namespace: NAMESPACE }),
      loadBlogIndex(locale),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
    ])
    return { locale, metadata, posts: posts.map((post) => toBlogPostSummary(post, locale)) }
  },
  pendingComponent: BlogIndexPending,
  staticData: { namespaces: [NAMESPACE] },
})
