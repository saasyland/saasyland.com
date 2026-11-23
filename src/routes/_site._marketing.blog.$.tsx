import type { JSX } from "react"

import { InlineTOC } from "@fumadocs/base-ui/components/inline-toc"
import { RootProvider } from "@fumadocs/base-ui/provider/tanstack"
import { createFileRoute, isNotFound, notFound } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"
import { loadBlogIndex } from "virtual:content-indexes"

import { relatedBlogPosts, toBlogPostLink, toBlogPostSummary } from "~/src/integrations/fumadocs/fumadocs.blog"
import type { BlogIndex, BlogPost } from "~/src/integrations/fumadocs/fumadocs.indexes"
import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { useFumadocsI18n } from "~/src/hooks/use-fumadocs-i18n"

import { BLOG_COVER } from "~/src/data/blog"

import { notFoundHead } from "~/src/lib/not-found"
import { buildBlogPostStructuredDataHtml, buildPageHead } from "~/src/lib/seo"

import { blogContent } from "~/src/presentation/components/custom/blog-content"
import { BackToBlogLink } from "~/src/presentation/components/custom/blog/back-to-blog-link"
import { BlogPostPending } from "~/src/presentation/components/custom/blog/blog-pending"
import { PostAuthor } from "~/src/presentation/components/custom/blog/post-author"
import { PostCta } from "~/src/presentation/components/custom/blog/post-cta"
import { usePostFaq } from "~/src/presentation/components/custom/blog/post-faq"
import { PostMeta } from "~/src/presentation/components/custom/blog/post-meta"
import { PostRail } from "~/src/presentation/components/custom/blog/post-rail"
import { PostRelated } from "~/src/presentation/components/custom/blog/post-related"
import { PostShare } from "~/src/presentation/components/custom/blog/post-share"
import { PostToc } from "~/src/presentation/components/custom/blog/post-toc"

import { APP_URL } from "~/src/presentation/branding"
import * as ROUTES from "~/src/routes"

const toPostData = ({ locale, post, posts }: { locale: SupportedLocale; post: BlogPost; posts: BlogIndex }) => {
  const { author, description, faq, image, path, toc, updated } = post

  return {
    ...toBlogPostSummary(post, locale),
    author,
    description,
    faq,
    image,
    path,
    related: relatedBlogPosts({ locale, post, posts }),
    toc,
    updated,
  }
}

type BlogPostData = ReturnType<typeof toPostData>

const SEARCH = { enabled: false } as const
const THEME = { enabled: false } as const

const BlogPostPage = (): JSX.Element => {
  const { locale, post, section } = Route.useLoaderData()
  const content = blogContent.useContent(post.path)
  const t = useTranslations("pages.blog")
  const faq = usePostFaq(post.faq)
  const i18n = useFumadocsI18n()

  const tags = post.tags.map((tag) => t(`tags.${tag}`))
  const structuredDataHtml = buildBlogPostStructuredDataHtml({
    author: post.author,
    authorRole: t(`authors.${post.author}.role`),
    baseUrl: APP_URL,
    blogTitle: section,
    date: post.date,
    description: post.description ?? post.summary,
    faq,
    image: post.image,
    keywords: tags,
    locale,
    title: post.title,
    updated: post.updated,
    url: post.url,
  })

  return (
    <article className="relative">
      {tags.map((tag) => (
        <meta content={tag} key={tag} property="article:tag" />
      ))}
      <script dangerouslySetInnerHTML={structuredDataHtml} type="application/ld+json" />
      <div className="mx-auto w-full max-w-site px-6 py-20 md:px-10 md:py-28">
        <BackToBlogLink />

        <h1 className="mt-8 max-w-[24ch] text-display-gate text-balance text-foreground">{post.title}</h1>
        {post.summary !== undefined && post.summary.length > 0 && (
          <p className="mt-6 max-w-[46ch] text-statement text-pretty text-muted-foreground">{post.summary}</p>
        )}

        <div className="mt-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-y border-border py-3">
          <PostMeta />
          <PostShare />
        </div>

        {post.image !== undefined && post.image.length > 0 && (
          <div className="relative mt-10 aspect-[2.4/1] w-full overflow-hidden rounded-lg border border-border bg-card">
            <img
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              fetchPriority="high"
              height={BLOG_COVER.HEIGHT}
              loading="eager"
              src={post.image}
              width={BLOG_COVER.WIDTH}
            />
          </div>
        )}
        <div className="mt-14 grid gap-x-16 lg:grid-cols-[minmax(0,72ch)_1fr] xl:grid-cols-[13rem_minmax(0,1fr)_15rem] xl:gap-x-12">
          <PostRail />
          <div className="min-w-0">
            <div className="mb-10 lg:hidden">
              <InlineTOC items={post.toc}>{t("post.contents")}</InlineTOC>
            </div>
            <RootProvider i18n={i18n} search={SEARCH} theme={THEME}>
              <div className="typeset typeset-article">{content}</div>
            </RootProvider>
            <div className="mt-16 border-y border-border py-4">
              <PostShare />
            </div>
            <PostAuthor />
            <PostCta />
            <PostRelated />
          </div>
          <PostToc />
        </div>
      </div>
    </article>
  )
}

const NAMESPACE = "pages.blog"

interface BlogPostLoaderData {
  readonly locale: SupportedLocale
  readonly post: BlogPostData
  readonly section: string
}

export const Route = createFileRoute("/_site/_marketing/blog/$")({
  component: BlogPostPage,
  head: ({ loaderData, match }: { loaderData?: BlogPostLoaderData | undefined; match: { error: unknown } }) => {
    if (isNotFound(match.error)) {
      return notFoundHead(getCurrentLocale())
    }

    return buildPageHead({
      author: loaderData?.post.author,
      dates: loaderData?.post,
      description: loaderData?.post.description ?? loaderData?.post.summary,
      locale: loaderData?.locale,
      pathname: loaderData?.post.url ?? ROUTES.BLOG,
      section: loaderData?.section,
      title: loaderData?.post.title,
      type: "article",
    })
  },
  loader: async ({ context, params }) => {
    const locale = getCurrentLocale()
    const [posts, blog] = await Promise.all([
      loadBlogIndex(locale),
      loadPageMetadata({ locale, namespace: NAMESPACE }),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
    ])
    const post = posts.find(({ url }) => url === `${ROUTES.BLOG}/${params._splat ?? ""}`)
    if (post === undefined) {
      throw notFound()
    }
    await blogContent.preload(post.path)
    return {
      locale,
      post: toPostData({ locale, post, posts }),
      posts: posts.map((other) => toBlogPostLink(other, locale)),
      section: blog.title,
    }
  },
  pendingComponent: BlogPostPending,
  staticData: { namespaces: [NAMESPACE] },
})
