import type { JSX } from "react"

import { Link } from "@tanstack/react-router"
import { useFormatter, useTranslations } from "use-intl/react"

import type { BlogPostSummary } from "~/src/integrations/fumadocs/fumadocs.source"

import { HighlightItem } from "~/src/presentation/components/custom/highlight"

export const PostRow = ({ post }: Readonly<{ post: BlogPostSummary }>): JSX.Element => {
  const t = useTranslations("pages.blog")
  const format = useFormatter()

  const tags = post.tags.join(" · ")

  return (
    <HighlightItem
      className="group"
      contentClassName="grid gap-x-10 gap-y-2 px-4 py-7 md:grid-cols-[10rem_1fr] md:items-baseline md:px-6 md:py-8"
      id={post.url}
    >
      <div className="font-mono text-spec text-muted-foreground tabular-nums">
        <p>{format.dateTime(new Date(post.date), { day: "numeric", month: "short", year: "numeric" })}</p>
        <p className="mt-1 text-muted-foreground/60">{t("post.readingTime", { minutes: post.readingTimeMinutes })}</p>
      </div>
      <div className="min-w-0">
        <h2 className="text-title text-balance text-foreground">
          <Link
            className="after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            to={post.url}
          >
            {post.title}
          </Link>
        </h2>
        {post.summary !== undefined && post.summary.length > 0 && (
          <p className="mt-2 max-w-[68ch] text-body text-pretty text-muted-foreground transition-colors duration-400 ease-exp group-hover:text-foreground">
            {post.summary}
          </p>
        )}
        {tags.length > 0 && <p className="mt-4 font-mono text-label text-muted-foreground/70 uppercase">{tags}</p>}
      </div>
    </HighlightItem>
  )
}
