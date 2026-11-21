import type { JSX } from "react"

import { Link } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import type { BlogPostSummary } from "~/src/integrations/fumadocs/fumadocs.blog"

import { PostDate, PostTags } from "~/src/presentation/components/custom/blog/post-facts"
import { HighlightItem } from "~/src/presentation/components/custom/highlight"

interface PostRowProps {
  readonly isUpdated?: boolean
  readonly post: BlogPostSummary
}

export const PostRow = ({ isUpdated = false, post }: PostRowProps): JSX.Element => {
  const t = useTranslations("pages.blog")

  return (
    <HighlightItem
      className="group"
      contentClassName="grid gap-x-10 gap-y-2 px-4 py-7 md:grid-cols-[10rem_1fr] md:items-baseline md:px-6 md:py-8"
      id={post.url}
    >
      <div className="font-mono text-spec text-muted-foreground tabular-nums">
        <p>
          <PostDate isUpdated={isUpdated} post={post} />
        </p>
        <p className="mt-1">{t("post.readingTime", { minutes: post.readingTimeMinutes })}</p>
      </div>
      <div className="min-w-0">
        <h3 className="text-title text-balance text-foreground">
          <Link
            className="after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            to={post.url}
          >
            {post.title}
          </Link>
        </h3>
        {post.summary !== undefined && post.summary.length > 0 && (
          <p className="mt-2 line-clamp-3 max-w-[68ch] text-body text-pretty text-muted-foreground transition-colors duration-400 ease-exp group-hover:text-foreground">
            {post.summary}
          </p>
        )}
        <PostTags className="mt-4" tags={post.tags} />
      </div>
    </HighlightItem>
  )
}
