import type { JSX } from "react"

import { Link, getRouteApi } from "@tanstack/react-router"
import { ArrowRight } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { PostFacts } from "~/src/presentation/components/custom/blog/post-facts"

import { ROUTES } from "~/src/routes"

const route = getRouteApi("/_site/_marketing/blog/$")

export const PostRelated = (): JSX.Element | undefined => {
  const t = useTranslations("pages.blog.post")

  const { post, posts } = route.useLoaderData()

  if (post.related.length === 0) {
    return
  }

  return (
    <section className="mt-16">
      <h2 className="text-label text-muted-foreground uppercase">{t("related")}</h2>
      <ul className="mt-4 divide-y divide-border border-y border-border">
        {post.related.map((related) => (
          <li className="group relative py-5" key={related.url}>
            <PostFacts post={related} />
            <h3 className="mt-1.5 text-body font-medium text-balance text-foreground decoration-border underline-offset-4 group-hover:underline">
              <Link
                className="after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                to={related.url}
              >
                {related.title}
              </Link>
            </h3>
          </li>
        ))}
      </ul>
      <Link
        className="group mt-6 inline-flex items-center gap-2 rounded-sm text-body-sm font-medium text-foreground transition-colors duration-200 ease-exp hover:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        to={ROUTES.BLOG.INDEX}
      >
        {t("allPosts", { count: posts.length })}
        <ArrowRight
          aria-hidden
          className="size-3.5 transition-transform duration-200 ease-exp group-hover:translate-x-0.5 motion-reduce:transition-none"
          strokeWidth={2}
        />
      </Link>
    </section>
  )
}
