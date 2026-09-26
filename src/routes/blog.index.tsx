import type { JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { useTranslations } from "use-intl/react"

import { MotionProvider } from "~/src/providers/motion-provider"

import { getPublishedBlogPosts } from "~/src/integrations/fumadocs/fumadocs.source"
import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { localeField } from "~/src/modules/_core/utils/zod-fields"

import { pageHead } from "~/src/lib/seo"

import { BlogIndexPending } from "~/src/presentation/components/custom/blog/blog-pending"
import { PostRow } from "~/src/presentation/components/custom/blog/post-row"
import { HighlightGroup } from "~/src/presentation/components/custom/highlight"

import { ROUTES } from "~/src/routes"

const getBlogPosts = createServerFn({ method: "GET" })
  .validator(localeField)
  .handler(({ data: locale }) => getPublishedBlogPosts(locale))

const BlogIndexPage = (): JSX.Element => {
  const { posts } = Route.useLoaderData()
  const t = useTranslations("pages.blog")

  const POSTS_EXIST = posts.length > 0

  return (
    <section className="relative">
      <div className="mx-auto w-full max-w-7xl px-6 py-24 md:px-10 md:py-32">
        <h1 className="max-w-[16ch] text-headline-peak text-balance text-foreground">{t("index.title")}</h1>
        <p className="mt-5 max-w-2xl text-lead text-pretty text-muted-foreground">{t("index.description")}</p>

        <div className="mt-14 md:mt-20">
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
      </div>
    </section>
  )
}

const NAMESPACE = "pages.blog"

export const Route = createFileRoute("/blog/")({
  component: BlogIndexPage,
  head: pageHead(ROUTES.BLOG),
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    const [metadata, posts] = await Promise.all([
      loadPageMetadata({ locale, namespace: NAMESPACE }),
      getBlogPosts({ data: locale }),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
    ])
    return { locale, metadata, posts }
  },
  pendingComponent: BlogIndexPending,
  staticData: { namespaces: [NAMESPACE] },
})
