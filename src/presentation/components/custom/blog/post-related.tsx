import type { JSX } from "react"

import { Link, getRouteApi } from "@tanstack/react-router"
import { useFormatter, useTranslations } from "use-intl/react"

const route = getRouteApi("/_site/_marketing/blog/$")

export const PostRelated = (): JSX.Element | undefined => {
  const t = useTranslations("pages.blog.post")
  const format = useFormatter()

  const { post } = route.useLoaderData()

  if (post.related.length === 0) {
    return undefined
  }

  return (
    <section className="mt-16">
      <h2 className="font-mono text-label text-muted-foreground uppercase">{t("related")}</h2>
      <ul className="mt-4 divide-y divide-border border-y border-border">
        {post.related.map((related) => (
          <li className="group relative grid gap-x-8 gap-y-1 py-5 md:grid-cols-[9rem_1fr] md:items-baseline" key={related.url}>
            <p className="font-mono text-spec text-muted-foreground tabular-nums">
              {format.dateTime(new Date(related.date), "calendarDate")}
              <span aria-hidden className="mx-2 text-border">
                &middot;
              </span>
              {t("readingTime", { minutes: related.readingTimeMinutes })}
            </p>
            <h3 className="text-body font-medium text-balance text-foreground decoration-border underline-offset-4 group-hover:underline">
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
    </section>
  )
}
