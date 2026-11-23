import type { JSX } from "react"

import { Link, getRouteApi } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import type { BlogPostSummary } from "~/src/integrations/fumadocs/fumadocs.blog"

import { PostFacts } from "~/src/presentation/components/custom/blog/post-facts"

const route = getRouteApi("/_site/_marketing/blog/")

interface PostListProps {
  readonly id: string
  readonly isUpdated?: boolean
  readonly posts: readonly BlogPostSummary[]
  readonly title: string
}

const PostList = ({ id, isUpdated = false, posts, title }: PostListProps): JSX.Element | undefined => {
  if (posts.length === 0) {
    return
  }

  return (
    <section aria-labelledby={id}>
      <h2 className="text-headline-support text-balance text-foreground" id={id}>
        {title}
      </h2>
      <ol className="mt-6 divide-y divide-border border-t border-border">
        {posts.map((post) => (
          <li className="group relative py-5" key={post.url}>
            <PostFacts isUpdated={isUpdated} post={post} />
            <h3 className="mt-2 text-title text-balance text-foreground decoration-border underline-offset-4 group-hover:underline">
              <Link
                className="after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                to={post.url}
              >
                {post.title}
              </Link>
            </h3>
          </li>
        ))}
      </ol>
    </section>
  )
}

export const RecentPosts = (): JSX.Element | undefined => {
  const t = useTranslations("pages.blog.index")

  const { latest, updated } = route.useLoaderData()

  if (latest.length === 0) {
    return
  }

  return (
    <div className="grid gap-x-12 gap-y-14 md:grid-cols-2">
      <PostList id="latest-posts" posts={latest} title={t("latest")} />
      <PostList id="updated-posts" isUpdated posts={updated} title={t("updated")} />
    </div>
  )
}
