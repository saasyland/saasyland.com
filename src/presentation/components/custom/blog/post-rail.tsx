import { type JSX, useEffect, useRef } from "react"

import { Link, getRouteApi } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

const route = getRouteApi("/_site/_marketing/blog/$")

const CURRENT_POST = '[aria-current="page"]'

const RAIL_OFFSET_RATIO = 3

export const PostRail = (): JSX.Element => {
  const t = useTranslations("pages.blog.post")
  const railRef = useRef<HTMLUListElement>(null)

  const { post, posts } = route.useLoaderData()

  useEffect(() => {
    const rail = railRef.current
    const current = rail?.querySelector(CURRENT_POST)
    if (rail !== null && current instanceof HTMLElement) {
      rail.scrollTop = current.offsetTop - rail.clientHeight / RAIL_OFFSET_RATIO
    }
  }, [post.url])

  return (
    <aside className="hidden xl:block">
      <nav aria-labelledby="post-rail-title" className="sticky top-24">
        <p className="font-mono text-label text-muted-foreground uppercase" id="post-rail-title">
          {t("rail")}
        </p>
        <ul className="custom-scrollbar relative mt-4 max-h-[calc(100dvh-11rem)] overflow-y-auto overscroll-contain pr-3" ref={railRef}>
          {posts.map((item) => (
            <li key={item.url}>
              <Link
                className="block border-l border-border py-1.5 pl-4 text-body-sm text-pretty text-muted-foreground transition-colors duration-200 ease-exp hover:border-ring hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring data-[status=active]:border-ring data-[status=active]:text-foreground"
                to={item.url}
              >
                {item.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}
