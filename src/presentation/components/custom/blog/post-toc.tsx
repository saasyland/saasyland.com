import type { JSX } from "react"

import { getRouteApi } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { TableOfContents } from "~/src/presentation/components/custom/table-of-contents"

const route = getRouteApi("/_site/_marketing/blog/$")

export const PostToc = (): JSX.Element => {
  const { post } = route.useLoaderData()
  const t = useTranslations("pages.blog.post")

  return (
    <aside className="hidden lg:block">
      <nav aria-labelledby="post-toc-title" className="sticky top-24">
        <p className="font-mono text-label text-muted-foreground uppercase" id="post-toc-title">
          {t("contents")}
        </p>
        <TableOfContents className="mt-4 max-h-[calc(100dvh-11rem)]" items={post.toc} />
      </nav>
    </aside>
  )
}
