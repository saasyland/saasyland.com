import type { JSX } from "react"

import { createFileRoute, isNotFound, notFound } from "@tanstack/react-router"
import { createTranslator } from "use-intl"
import { useTranslations } from "use-intl/react"
import { loadBlogIndex } from "virtual:content-indexes"
import * as zod from "zod"

import { MotionProvider } from "~/src/providers/motion-provider"

import {
  blogArchivePage,
  blogArchivePageCount,
  blogArchivePath,
  blogArchiveSequence,
  toBlogPostSummary,
} from "~/src/integrations/fumadocs/fumadocs.blog"
import { loadNamespace, loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { BLOG_ARCHIVE } from "~/src/data/blog"

import { buildBlogArchiveStructuredDataHtml } from "~/src/lib/blog-seo"
import { notFoundHead } from "~/src/lib/not-found"
import { type PageLoaderData, buildPageHead } from "~/src/lib/seo"

import { BlogArchivePending } from "~/src/presentation/components/custom/blog/blog-pending"
import { PostFinderLayout } from "~/src/presentation/components/custom/blog/post-finder"
import { PostPagination } from "~/src/presentation/components/custom/blog/post-pagination"
import { PostRow } from "~/src/presentation/components/custom/blog/post-row"
import { ContentPage } from "~/src/presentation/components/custom/content-page"
import { HighlightGroup } from "~/src/presentation/components/custom/highlight"

const BlogArchivePage = (): JSX.Element => {
  const t = useTranslations("pages.blog")

  const { blogTitle, listed, locale, metadata, offset, page, pages, posts, total } = Route.useLoaderData()

  const structuredDataHtml = buildBlogArchiveStructuredDataHtml({
    blogTitle,
    description: metadata.description,
    listed,
    locale,
    offset,
    pathname: blogArchivePath(page),
    title: metadata.title,
    total,
  })

  return (
    <ContentPage lead={t("archive.pageLead", { page, pages, total })} title={t("archive.pageHeading", { page })}>
      <script dangerouslySetInnerHTML={structuredDataHtml} type="application/ld+json" />
      <PostFinderLayout locale={locale} posts={posts}>
        <section aria-labelledby="archive-posts">
          <h2 className="sr-only" id="archive-posts">
            {t("archive.title")}
          </h2>
          <MotionProvider>
            <HighlightGroup className="-mx-4 divide-y divide-border border-y border-border md:-mx-6" name="blog-highlight">
              {listed.map((post) => (
                <PostRow key={post.url} post={post} />
              ))}
            </HighlightGroup>
          </MotionProvider>
        </section>
        <PostPagination page={page} pages={pages} />
      </PostFinderLayout>
    </ContentPage>
  )
}

const NAMESPACE = "pages.blog"

const PAGE_NUMBER = /^[1-9]\d*$/u

const archiveMessagesSchema = zod.object({ archive: zod.object({ pageTitle: zod.string() }) })

type BlogArchiveLoaderData = PageLoaderData & { readonly page: number; readonly pages: number }

export const Route = createFileRoute("/_site/_marketing/blog/page/$page")({
  component: BlogArchivePage,
  head: ({ loaderData, match }: { loaderData?: BlogArchiveLoaderData | undefined; match: { error: unknown } }) => {
    if (isNotFound(match.error) || loaderData === undefined) {
      return notFoundHead(getCurrentLocale())
    }

    return buildPageHead({
      ...loaderData.metadata,
      locale: loaderData.locale,
      pathname: blogArchivePath(loaderData.page),
      sequence: blogArchiveSequence(loaderData),
    })
  },
  loader: async ({ context, params }) => {
    const locale = getCurrentLocale()
    const [metadata, messages, index] = await Promise.all([
      loadPageMetadata({ locale, namespace: NAMESPACE }),
      loadNamespace({ locale, namespace: NAMESPACE }),
      loadBlogIndex(locale),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
    ])
    const page = Number(params.page)
    const pages = blogArchivePageCount(index.length)

    if (!PAGE_NUMBER.test(params.page) || page <= BLOG_ARCHIVE.FIRST_PAGE || page > pages) {
      throw notFound()
    }

    const t = createTranslator({
      locale,
      messages: { pages: { blog: archiveMessagesSchema.parse(messages) } },
      namespace: "pages.blog.archive",
    })

    const posts = index.map((post) => toBlogPostSummary(post, locale))

    return {
      blogTitle: metadata.title,
      listed: blogArchivePage(posts, page),
      locale,
      metadata: { description: metadata.description, title: t("pageTitle", { page, title: metadata.title }) },
      offset: (page - BLOG_ARCHIVE.FIRST_PAGE) * BLOG_ARCHIVE.PAGE_SIZE,
      page,
      pages,
      posts,
      total: index.length,
    }
  },
  pendingComponent: BlogArchivePending,
  staticData: { namespaces: [NAMESPACE] },
})
