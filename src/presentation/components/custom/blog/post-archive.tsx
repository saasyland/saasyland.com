import type { JSX, MouseEvent } from "react"

import { Link, getRouteApi } from "@tanstack/react-router"
import { Button } from "react-aria-components"
import { useTranslations } from "use-intl/react"

import { useBlogView } from "~/src/hooks/use-blog-view"

import { BLOG_ARCHIVE, BLOG_SORT } from "~/src/data/blog"
import { CTA_CLASSES } from "~/src/data/cta"

import { cn } from "~/src/lib/cn"

import { PostRow } from "~/src/presentation/components/custom/blog/post-row"
import { HighlightGroup } from "~/src/presentation/components/custom/highlight"

const route = getRouteApi("/_site/_marketing/blog/")

const TITLE_ID = `${BLOG_ARCHIVE.SECTION_ID}-title`

const opensElsewhere = (event: MouseEvent<HTMLAnchorElement>): boolean => event.altKey || event.ctrlKey || event.metaKey || event.shiftKey

const NoMatches = ({ onShowAll }: { readonly onShowAll: () => void }): JSX.Element => {
  const t = useTranslations("pages.blog.archive")

  return (
    <div className="mt-10 flex flex-col items-start gap-5 border-y border-border py-12">
      <p className="max-w-[52ch] text-body text-pretty text-muted-foreground">{t("empty")}</p>
      <Button className={cn(CTA_CLASSES.SECONDARY, "cursor-pointer")} onPress={onShowAll}>
        {t("showAll")}
      </Button>
    </div>
  )
}

export const PostArchive = (): JSX.Element => {
  const t = useTranslations("pages.blog")

  const { locale, posts } = route.useLoaderData()
  const navigate = route.useNavigate()
  const { isFiltered, matches, update, view } = useBlogView({ locale, posts })

  const loadedPages = view.page ?? BLOG_ARCHIVE.FIRST_PAGE
  const shown = matches.slice(0, loadedPages * BLOG_ARCHIVE.PAGE_SIZE)

  const loadMore = (event: MouseEvent<HTMLAnchorElement>): void => {
    if (opensElsewhere(event)) {
      return
    }

    event.preventDefault()
    void navigate({ replace: true, resetScroll: false, search: (previous) => ({ ...previous, page: loadedPages + 1 }) })
  }

  return (
    <section
      aria-labelledby={TITLE_ID}
      className="scroll-mt-6 border-t border-border pt-16 md:pt-20 lg:min-h-[calc(100dvh-1rem)] lg:-scroll-mt-12 max-lg:[:root:has([data-active-filters])_&]:scroll-mt-16"
      id={BLOG_ARCHIVE.SECTION_ID}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 className="text-headline-support text-balance text-foreground" id={TITLE_ID}>
          {t("archive.title")}
        </h2>
        <p aria-live="polite" className="text-spec text-muted-foreground tabular-nums">
          {!isFiltered && t("archive.count", { count: posts.length })}
          {isFiltered && t("archive.matches", { count: matches.length })}
        </p>
      </div>

      {matches.length === 0 && (
        <NoMatches
          onShowAll={() => {
            update({ q: undefined, tag: undefined })
          }}
        />
      )}

      {shown.length > 0 && (
        <HighlightGroup className="-mx-4 mt-10 divide-y divide-border border-y border-border md:-mx-6" name="blog-highlight">
          {shown.map((post) => (
            <PostRow isUpdated={view.sort === BLOG_SORT.UPDATED} key={post.url} post={post} />
          ))}
        </HighlightGroup>
      )}

      {shown.length < matches.length && (
        <div className="mt-10 flex flex-col items-center gap-4">
          <p className="text-spec text-muted-foreground tabular-nums">
            {t("archive.showing", { shown: shown.length, total: matches.length })}
          </p>
          <Link className={CTA_CLASSES.SECONDARY} onClick={loadMore} params={{ page: String(loadedPages + 1) }} to="/blog/page/$page">
            {t("archive.loadMore")}
          </Link>
        </div>
      )}
    </section>
  )
}
