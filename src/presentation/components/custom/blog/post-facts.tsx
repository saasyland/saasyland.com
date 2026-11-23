import type { JSX, ReactNode } from "react"

import { useFormatter, useTranslations } from "use-intl/react"

import type { BlogPostSummary } from "~/src/integrations/fumadocs/fumadocs.blog"

import { cn } from "~/src/lib/cn"

interface PostDateProps {
  readonly isUpdated?: boolean
  readonly post: Pick<BlogPostSummary, "date" | "updated">
}

const timeTag =
  (value: Date) =>
  (chunks: ReactNode): JSX.Element => <time dateTime={value.toISOString()}>{chunks}</time>

export const PostDate = ({ isUpdated = false, post }: PostDateProps): ReactNode => {
  const t = useTranslations("pages.blog.post")
  const format = useFormatter()

  const value = new Date(isUpdated ? (post.updated ?? post.date) : post.date)
  const date = format.dateTime(value, "calendarDate")

  if (isUpdated) {
    return t.rich("updated", { date, time: timeTag(value) })
  }

  return timeTag(value)(date)
}

type PostFactsProps = PostDateProps & {
  readonly className?: string
  readonly post: Pick<BlogPostSummary, "readingTimeMinutes">
}

export const PostFacts = ({ className, isUpdated = false, post }: PostFactsProps): JSX.Element => {
  const t = useTranslations("pages.blog.post")

  return (
    <p className={cn("text-spec text-muted-foreground tabular-nums", className)}>
      <PostDate isUpdated={isUpdated} post={post} />
      <span aria-hidden className="mx-2 text-border">
        &middot;
      </span>
      {t("readingTime", { minutes: post.readingTimeMinutes })}
    </p>
  )
}

export const PostTags = ({
  className,
  tags,
}: {
  readonly className?: string
  readonly tags: BlogPostSummary["tags"]
}): JSX.Element | undefined => {
  const t = useTranslations("pages.blog")

  if (tags.length === 0) {
    return
  }

  return <p className={cn("text-label text-muted-foreground uppercase", className)}>{tags.map((tag) => t(`tags.${tag}`)).join(" · ")}</p>
}
