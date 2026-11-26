import type { JSX } from "react"

import { Link, getRouteApi } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { AUTHOR_IMAGE_SIZE, BLOG_AUTHORS } from "~/src/data/blog"

import { AuthorLinks } from "~/src/presentation/components/custom/blog/author-links"

const route = getRouteApi("/_site/_marketing/blog/$")

export const PostAuthor = (): JSX.Element => {
  const t = useTranslations("pages.blog")

  const { post } = route.useLoaderData()
  const { image, name } = BLOG_AUTHORS[post.author]

  return (
    <div className="mt-10 flex flex-col gap-5 rounded-lg border border-border bg-card p-6 sm:flex-row sm:gap-6 md:p-8">
      <img
        alt=""
        className="size-16 shrink-0 rounded-full border border-border bg-muted object-cover"
        decoding="async"
        height={AUTHOR_IMAGE_SIZE}
        loading="lazy"
        src={image}
        width={AUTHOR_IMAGE_SIZE}
      />
      <div className="min-w-0 flex-1">
        <p className="text-label text-muted-foreground uppercase">{t("author.writtenBy")}</p>
        <p className="mt-1.5 text-title-lg text-foreground">
          <Link
            className="rounded-sm underline decoration-border underline-offset-4 transition-colors duration-200 ease-exp hover:decoration-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            params={{ author: post.author }}
            rel="author"
            to="/authors/$author"
          >
            {name}
          </Link>
        </p>
        <p className="mt-1 text-body-sm text-muted-foreground">{t(`authors.${post.author}.role`)}</p>
        <p className="mt-4 max-w-[64ch] text-body text-pretty text-muted-foreground">{t(`authors.${post.author}.bio`)}</p>
        <div className="mt-4 -ml-1.5">
          <AuthorLinks author={post.author} />
        </div>
      </div>
    </div>
  )
}
