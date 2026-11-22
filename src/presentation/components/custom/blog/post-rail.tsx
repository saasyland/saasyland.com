import { type JSX, type Ref, useEffect, useRef } from "react"

import { Link, getRouteApi } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { cn } from "~/src/lib/cn"

const route = getRouteApi("/_site/_marketing/blog/$")

const CURRENT_POST = '[aria-current="page"]'

const RAIL_OFFSET_RATIO = 3

interface PostRailListProps {
  readonly className: string
  readonly posts: readonly { readonly title: string; readonly url: string }[]
  readonly ref?: Ref<HTMLUListElement>
}

export const PostRailList = ({ className, posts, ref }: PostRailListProps): JSX.Element => (
  <ul className={cn("custom-scrollbar relative overflow-y-auto overscroll-contain pr-3", className)} ref={ref}>
    {posts.map((item) => (
      <li key={item.url}>
        <Link
          className="block border-l border-border py-1.5 pl-4 text-body-sm text-pretty text-muted-foreground transition-colors duration-200 ease-exp hover:border-ring hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring data-[status=active]:border-ring data-[status=active]:text-ring"
          to={item.url}
        >
          {item.title}
        </Link>
      </li>
    ))}
  </ul>
)

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
        <p className="text-label text-muted-foreground uppercase" id="post-rail-title">
          {t("rail")}
        </p>
        <PostRailList className="mt-4 max-h-[calc(100dvh-11rem)]" posts={posts} ref={railRef} />
      </nav>
    </aside>
  )
}
