import type { JSX } from "react"

import { getRouteApi } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { cn } from "~/src/lib/cn"

const route = getRouteApi("/blog/$")

const TOP_DEPTH = 2

export const PostToc = (): JSX.Element => {
  const { post } = route.useLoaderData()
  const t = useTranslations("pages.blog.post")

  return (
    <aside className="hidden lg:block">
      <div className="sticky top-24">
        <p className="font-mono text-label text-muted-foreground uppercase">{t("contents")}</p>
        <ul className="mt-4">
          {post.toc.map((item) => (
            <li key={item.url}>
              <a
                className={cn(
                  "block border-l border-border py-1.5 text-body-sm text-pretty text-muted-foreground transition-colors duration-200 ease-exp hover:border-ring hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  { "pl-4": item.depth <= TOP_DEPTH, "pl-7": item.depth > TOP_DEPTH },
                )}
                href={item.url}
              >
                {item.title}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}
