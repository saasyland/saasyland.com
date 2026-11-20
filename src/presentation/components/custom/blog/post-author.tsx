import type { JSX } from "react"

import { getRouteApi } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

const route = getRouteApi("/_site/_marketing/blog/$")

const AVATAR_SIZE = 48

export const PostAuthor = (): JSX.Element => {
  const t = useTranslations("pages.blog.post.author")

  const { post } = route.useLoaderData()

  return (
    <div className="flex items-center gap-4">
      {post.authorImage !== undefined && (
        <img
          alt=""
          className="size-12 shrink-0 rounded-full border border-border bg-card object-cover"
          decoding="async"
          height={AVATAR_SIZE}
          loading="lazy"
          src={post.authorImage}
          width={AVATAR_SIZE}
        />
      )}
      <div className="min-w-0">
        <p className="font-mono text-label text-muted-foreground uppercase">{t("label")}</p>
        {post.authorUrl === undefined && <p className="mt-1 text-body font-medium text-foreground">{post.authorName}</p>}
        {post.authorUrl !== undefined && (
          <a
            className="mt-1 inline-block rounded-sm text-body font-medium text-foreground underline decoration-border underline-offset-4 transition-colors duration-200 ease-exp hover:decoration-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            href={post.authorUrl}
            rel="author noopener noreferrer"
            target="_blank"
          >
            {post.authorName}
          </a>
        )}
      </div>
    </div>
  )
}
