import type { JSX } from "react"

import { getRouteApi } from "@tanstack/react-router"
import { useFormatter, useTranslations } from "use-intl/react"

const route = getRouteApi("/blog/$")

export const PostMeta = (): JSX.Element => {
  const { post } = route.useLoaderData()
  const t = useTranslations("pages.blog.post")
  const format = useFormatter()

  const details = [post.authorName, t("readingTime", { minutes: post.readingTimeMinutes }), post.tags.join(", ")].filter(
    (item) => item.trim().length > 0,
  )

  return (
    <div className="mt-10 flex flex-wrap items-center gap-x-3 gap-y-2 border-y border-border py-4 font-mono text-body-sm text-muted-foreground">
      <span className="flex items-center gap-2.5">
        <span aria-hidden className="size-1.25 shrink-0 rounded-xs bg-ring" />
        <time className="tabular-nums" dateTime={new Date(post.date).toISOString()}>
          {format.dateTime(new Date(post.date), { day: "numeric", month: "long", year: "numeric" })}
        </time>
      </span>
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
