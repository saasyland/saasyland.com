import type { JSX, ReactNode } from "react"

import { getRouteApi } from "@tanstack/react-router"
import { useFormatter, useTranslations } from "use-intl/react"

const route = getRouteApi("/_site/_marketing/blog/$")

const timeTag =
  (value: Date) =>
  (chunks: ReactNode): JSX.Element => (
    <time className="tabular-nums" dateTime={value.toISOString()}>
      {chunks}
    </time>
  )

export const PostMeta = (): JSX.Element => {
  const { post } = route.useLoaderData()
  const t = useTranslations("pages.blog")
  const format = useFormatter()

  const published = new Date(post.date)
  const updated = new Date(post.updated ?? post.date)
  const dateOf = (value: Date): string => format.dateTime(value, "calendarDate", { month: "long" })
  const tags = post.tags.map((tag) => t(`tags.${tag}`)).join(", ")
  const details = [post.authorName, t("post.readingTime", { minutes: post.readingTimeMinutes }), tags].filter(
    (item) => item.trim().length > 0,
  )

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 py-1 text-body-sm text-muted-foreground tabular-nums">
      <span className="flex items-center gap-2.5">
        <span aria-hidden className="size-1.25 shrink-0 rounded-full bg-ring" />
        <span>{t.rich("post.published", { date: dateOf(published), time: timeTag(published) })}</span>
      </span>
      {updated.getTime() > published.getTime() && (
        <span className="flex items-center gap-3">
          <span aria-hidden className="text-border">
            &middot;
          </span>
          <span>{t.rich("post.updated", { date: dateOf(updated), time: timeTag(updated) })}</span>
        </span>
      )}
      {details.map((item) => (
        <span className="flex items-center gap-3" key={item}>
          <span aria-hidden className="text-border">
            &middot;
          </span>
          {item}
        </span>
      ))}
    </div>
  )
}
