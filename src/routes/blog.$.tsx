import { type JSX, type ReactNode, isValidElement } from "react"

import { Link, createFileRoute, notFound } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { InlineTOC } from "fumadocs-ui/components/inline-toc"
import { useTranslations } from "use-intl/react"
import zod from "zod/v4"

import { type BlogPostSummary, blogSource, toBlogPostSummary } from "~/src/integrations/fumadocs/fumadocs.source"
import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { localeField } from "~/src/modules/_core/utils/zod-fields"

import { buildBlogPostStructuredDataHtml, buildPageHead } from "~/src/lib/seo"

import { blogContent } from "~/src/presentation/components/custom/blog-content"
import { BlogPostPending } from "~/src/presentation/components/custom/blog/blog-pending"
import { PostCta } from "~/src/presentation/components/custom/blog/post-cta"
import { PostMeta } from "~/src/presentation/components/custom/blog/post-meta"
import { PostShare } from "~/src/presentation/components/custom/blog/post-share"
import { PostToc } from "~/src/presentation/components/custom/blog/post-toc"

import { APP_URL } from "~/src/presentation/branding"
import { ROUTES } from "~/src/routes"

const tocItemTitle = (title: ReactNode): string => {
  if (typeof title === "string" || typeof title === "number" || typeof title === "bigint") {
    return String(title)
  }

  if (isValidElement<{ children?: ReactNode }>(title)) {
    return tocItemTitle(title.props.children)
  }

  if (typeof title === "object" && title !== null && Symbol.iterator in title) {
    return Array.from(title, tocItemTitle).join("")
  }

  return ""
}

const getBlogPost = createServerFn({ method: "GET" })
  .validator(zod.object({ locale: localeField, slug: zod.string() }))
  .handler(({ data: { locale, slug } }) => {
    const page = blogSource.getPage(slug.split("/"), locale)
    if (!page || !page.data.published) {
      throw notFound()
    }
    return {
      ...toBlogPostSummary(page, locale),
      authorName: page.data.authorName,
      faq: page.data.faq,
      image: page.data.image,
      path: page.path,
      toc: page.data.toc.map((item) => ({ depth: item.depth, title: tocItemTitle(item.title), url: item.url })),
      updated: page.data.updated,
    }
  })

const BlogPostPage = (): JSX.Element => {
  const { post } = Route.useLoaderData()
  const content = blogContent.useContent(post.path)
  const t = useTranslations("pages.blog.post")

  const structuredDataHtml = buildBlogPostStructuredDataHtml({
    authorName: post.authorName,
    baseUrl: APP_URL,
    date: post.date,
    description: post.summary,
    faq: post.faq,
    image: post.image,
    title: post.title,
    updated: post.updated,
    url: post.url,
  })

  return (
    <article className="relative">
      <script dangerouslySetInnerHTML={structuredDataHtml} type="application/ld+json" />
      <div className="mx-auto w-full max-w-7xl px-6 py-20 md:px-10 md:py-28">
        <Link
          className="inline-flex items-center gap-2 font-mono text-label text-muted-foreground uppercase transition-colors duration-200 ease-exp hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          to={ROUTES.BLOG}
        >
          <span aria-hidden>&larr;</span>
          {t("backToBlog")}
        </Link>

        <h1 className="mt-8 max-w-[24ch] text-display-gate text-balance text-foreground">{post.title}</h1>
        {post.summary !== undefined && post.summary.length > 0 && (
          <p className="mt-6 max-w-[46ch] text-statement text-pretty text-muted-foreground">{post.summary}</p>
        )}

        <PostMeta />

        {post.image !== undefined && post.image.length > 0 && (
          <div className="relative mt-10 aspect-[2.4/1] w-full overflow-hidden rounded-xl border border-border bg-card">
            <img
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              fetchPriority="high"
              loading="eager"
              sizes="(max-width: 48rem) 100vw, 64rem"
              src={post.image}
            />
          </div>
        )}
        <div className="mt-14 grid gap-x-16 lg:grid-cols-[minmax(0,72ch)_1fr]">
          <div className="min-w-0">
            <div className="mb-10 lg:hidden">
              <InlineTOC items={post.toc} />
            </div>
            <div className="typeset typeset-article">{content}</div>
            <PostCta />
            <div className="mt-16 border-t border-border pt-8">
              <PostShare />
            </div>
          </div>
          <PostToc />
        </div>
      </div>
    </article>
  )
}

const NAMESPACE = "pages.blog"

export const Route = createFileRoute("/blog/$")({
  component: BlogPostPage,
  head: ({ loaderData }: { loaderData?: { locale: SupportedLocale; post: BlogPostSummary } | undefined }) =>
    buildPageHead({
      description: loaderData?.post.summary,
      locale: loaderData?.locale,
      pathname: loaderData?.post.url ?? ROUTES.BLOG,
      title: loaderData?.post.title,
      type: "article",
    }),
  loader: async ({ context, params }) => {
    const locale = getCurrentLocale()
    const [post] = await Promise.all([
      getBlogPost({ data: { locale, slug: params._splat ?? "" } }),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
    ])
    await blogContent.preload(post.path)
    return { locale, post }
  },
  pendingComponent: BlogPostPending,
  staticData: { namespaces: [NAMESPACE] },
})
