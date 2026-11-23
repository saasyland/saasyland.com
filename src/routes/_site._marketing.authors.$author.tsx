import type { JSX } from "react"

import { Link, createFileRoute, isNotFound, notFound } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"
import { loadBlogIndex } from "virtual:content-indexes"
import * as zod from "zod"

import { MotionProvider } from "~/src/providers/motion-provider"

import { toBlogPostSummary } from "~/src/integrations/fumadocs/fumadocs.blog"
import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { loadNamespace, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { AUTHOR_IMAGE_SIZE, BLOG_AUTHOR, BLOG_AUTHORS, type BlogAuthor, blogAuthorPath } from "~/src/data/blog"

import { notFoundHead } from "~/src/lib/not-found"
import { buildAuthorStructuredDataHtml, buildPageHead } from "~/src/lib/seo"

import { AuthorLinks } from "~/src/presentation/components/custom/blog/author-links"
import { AuthorPending } from "~/src/presentation/components/custom/blog/blog-pending"
import { PostRow } from "~/src/presentation/components/custom/blog/post-row"
import { HighlightGroup } from "~/src/presentation/components/custom/highlight"

import { APP_URL } from "~/src/presentation/branding"
import { ROUTES } from "~/src/routes"

const POSTS_TITLE_ID = "author-posts"

const AuthorPage = (): JSX.Element => {
  const t = useTranslations("pages.blog")

  const { author, locale, posts } = Route.useLoaderData()
  const { image, name } = BLOG_AUTHORS[author]
  const role = t(`authors.${author}.role`)
  const bio = t(`authors.${author}.bio`)
  const structuredDataHtml = buildAuthorStructuredDataHtml({ author, authorRole: role, baseUrl: APP_URL, description: bio, locale })

  return (
    <section className="relative">
      <script dangerouslySetInnerHTML={structuredDataHtml} type="application/ld+json" />
      <div className="mx-auto w-full max-w-site px-6 py-20 md:px-10 md:py-28">
        <Link
          className="inline-flex items-center gap-2 text-label text-muted-foreground uppercase transition-colors duration-200 ease-exp hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          to={ROUTES.BLOG}
        >
          <span aria-hidden>&larr;</span>
          {t("post.backToBlog")}
        </Link>

        <div className="mt-10 flex flex-col gap-8 md:flex-row md:items-start md:gap-12">
          <img
            alt=""
            className="size-28 shrink-0 rounded-full border border-border bg-muted object-cover md:size-36"
            decoding="async"
            fetchPriority="high"
            height={AUTHOR_IMAGE_SIZE}
            src={image}
            width={AUTHOR_IMAGE_SIZE}
          />
          <div className="min-w-0">
            <p className="text-label text-muted-foreground uppercase">{t("author.label")}</p>
            <h1 className="mt-3 text-display-gate text-balance text-foreground">{name}</h1>
            <p className="mt-4 text-statement text-pretty text-foreground">{role}</p>
            <p className="mt-5 max-w-[62ch] text-lead text-pretty text-muted-foreground">{bio}</p>
            <div className="mt-6 -ml-2">
              <AuthorLinks author={author} />
            </div>
          </div>
        </div>

        <section aria-labelledby={POSTS_TITLE_ID} className="mt-20 border-t border-border pt-16 md:mt-28 md:pt-20">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <h2 className="text-headline-support text-balance text-foreground" id={POSTS_TITLE_ID}>
              {t("author.posts", { name })}
            </h2>
            <p className="text-spec text-muted-foreground tabular-nums">{t("archive.count", { count: posts.length })}</p>
          </div>
          <MotionProvider>
            <HighlightGroup className="-mx-4 mt-10 divide-y divide-border border-y border-border md:-mx-6" name="author-highlight">
              {posts.map((post) => (
                <PostRow key={post.url} post={post} />
              ))}
            </HighlightGroup>
          </MotionProvider>
        </section>

        <p className="mt-10 text-body-sm text-muted-foreground">{t("author.disclaimer")}</p>
      </div>
    </section>
  )
}

const NAMESPACE = "pages.blog"

const authorSchema = zod.enum(BLOG_AUTHOR)

const authorMessageSchema = zod.object({ bio: zod.string() })

const authorMessagesSchema = zod.object({ authors: zod.record(authorSchema, authorMessageSchema) })

interface AuthorLoaderData {
  readonly author: BlogAuthor
  readonly description: string
  readonly locale: SupportedLocale
}

export const Route = createFileRoute("/_site/_marketing/authors/$author")({
  component: AuthorPage,
  head: ({ loaderData, match }: { loaderData?: AuthorLoaderData | undefined; match: { error: unknown } }) => {
    if (isNotFound(match.error) || loaderData === undefined) {
      return notFoundHead(getCurrentLocale())
    }

    return buildPageHead({
      description: loaderData.description,
      locale: loaderData.locale,
      pathname: blogAuthorPath(loaderData.author),
      title: BLOG_AUTHORS[loaderData.author].name,
      type: "profile",
    })
  },
  loader: async ({ context, params }) => {
    const locale = getCurrentLocale()
    const { data: author, success } = authorSchema.safeParse(params.author)

    if (!success) {
      throw notFound()
    }

    const [messages, index] = await Promise.all([
      loadNamespace({ locale, namespace: NAMESPACE }),
      loadBlogIndex(locale),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
    ])

    return {
      author,
      description: authorMessagesSchema.parse(messages).authors[author].bio,
      locale,
      posts: (Object.groupBy(index, (post) => post.author)[author] ?? []).map((post) => toBlogPostSummary(post, locale)),
    }
  },
  pendingComponent: AuthorPending,
  staticData: { namespaces: [NAMESPACE] },
})
