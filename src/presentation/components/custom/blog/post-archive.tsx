import { type JSX, type MouseEvent, useState } from "react"

import { Link, getRouteApi, useHydrated } from "@tanstack/react-router"
import { SearchIcon, X } from "lucide-react"
import { Button, SearchField } from "react-aria-components"
import { useTranslations } from "use-intl/react"

import { BLOG_ARCHIVE, BLOG_SORT, BLOG_SORTS, BLOG_TAGS, type BlogSort, type BlogTag } from "~/src/data/blog"
import { CTA_CLASSES } from "~/src/data/cta"

import { countBlogTags, filterBlogPosts, sortBlogPosts } from "~/src/lib/blog-archive"
import { cn } from "~/src/lib/cn"

import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "~/src/presentation/components/shadcn/input-group"
import { ToggleGroup, ToggleGroupItem } from "~/src/presentation/components/shadcn/toggle-group"

import { PostRow } from "~/src/presentation/components/custom/blog/post-row"
import { HighlightGroup } from "~/src/presentation/components/custom/highlight"

const route = getRouteApi("/_site/_marketing/blog/")

const POST_ARCHIVE_ID = "all-posts"

const ALL_TOPICS = "all"

interface ArchiveView {
  readonly page?: number | undefined
  readonly q?: string | undefined
  readonly sort: BlogSort
  readonly tag?: BlogTag | undefined
}

const STATIC_VIEW: ArchiveView = { sort: BLOG_SORT.NEWEST }

const CHIP_CLASSNAME =
  "h-8 shrink-0 cursor-pointer gap-1.5 rounded-full border border-border px-3 text-body-sm font-normal text-muted-foreground transition-colors duration-200 ease-exp hover:border-ring/40 hover:bg-transparent hover:text-foreground data-focus-visible:outline-2 data-focus-visible:outline-offset-2 data-focus-visible:outline-ring data-selected:border-ring/50 data-selected:bg-ring/10 data-selected:text-foreground"

const SORT_CLASSNAME =
  "h-8 min-w-0 flex-1 cursor-pointer rounded-md px-3 text-body-sm font-normal text-muted-foreground transition-colors duration-200 ease-exp hover:bg-transparent hover:text-foreground data-focus-visible:outline-2 data-focus-visible:outline-offset-2 data-focus-visible:outline-ring data-selected:bg-muted data-selected:text-foreground sm:flex-none"

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
  const hydrated = useHydrated()

  const { locale, posts } = route.useLoaderData()
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const [draft, setDraft] = useState<string>()

  const view = hydrated ? search : STATIC_VIEW
  const query = draft ?? view.q ?? ""
  const label = (tag: BlogTag): string => t(`tags.${tag}`)
  const matches = sortBlogPosts(filterBlogPosts({ label, locale, posts, query, tag: view.tag }), view.sort)
  const loadedPages = view.page ?? BLOG_ARCHIVE.FIRST_PAGE
  const shown = matches.slice(0, loadedPages * BLOG_ARCHIVE.PAGE_SIZE)
  const isFiltered = query.trim().length > 0 || view.tag !== undefined

  const update = (next: Partial<ArchiveView>): void => {
    void navigate({ replace: true, resetScroll: false, search: (previous) => ({ ...previous, page: undefined, ...next }) })
  }

  const changeQuery = (value: string): void => {
    setDraft(value)
    update({ q: value.trim().length > 0 ? value : undefined })
  }

  const showAll = (): void => {
    setDraft("")
    update({ q: undefined, tag: undefined })
  }

  const loadMore = (event: MouseEvent<HTMLAnchorElement>): void => {
    if (opensElsewhere(event)) {
      return
    }

    event.preventDefault()
    void navigate({ replace: true, resetScroll: false, search: (previous) => ({ ...previous, page: loadedPages + 1 }) })
  }

  return (
    <section
      aria-labelledby={`${POST_ARCHIVE_ID}-title`}
      className="mt-20 scroll-mt-24 border-t border-border pt-16 md:mt-28 md:pt-20"
      id={POST_ARCHIVE_ID}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 className="text-headline-support text-balance text-foreground" id={`${POST_ARCHIVE_ID}-title`}>
          {t("archive.title")}
        </h2>
        <p aria-live="polite" className="font-mono text-spec text-muted-foreground tabular-nums">
          {!isFiltered && t("archive.count", { count: posts.length })}
          {isFiltered && t("archive.matches", { count: matches.length })}
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <SearchField aria-label={t("archive.search")} className="w-full md:max-w-sm" onChange={changeQuery} value={query}>
          <InputGroup className="h-10 bg-card/60 dark:bg-card/60">
            <InputGroupAddon>
              <SearchIcon aria-hidden className="size-4" />
            </InputGroupAddon>
            <InputGroupInput
              className="text-body-sm [&::-webkit-search-cancel-button]:hidden"
              placeholder={t("archive.searchPlaceholder")}
            />
            {query.length > 0 && (
              <InputGroupAddon align="inline-end">
                <InputGroupButton aria-label={t("archive.clearSearch")} size="icon-xs">
                  <X aria-hidden />
                </InputGroupButton>
              </InputGroupAddon>
            )}
          </InputGroup>
        </SearchField>

        <ToggleGroup
          aria-label={t("archive.sort")}
          className="w-full gap-1 rounded-lg border border-border bg-card/60 p-1 sm:w-fit"
          disallowEmptySelection
          onSelectionChange={(keys) => {
            for (const sort of BLOG_SORTS) {
              if (keys.has(sort)) {
                update({ sort })
              }
            }
          }}
          selectedKeys={[view.sort]}
          selectionMode="single"
        >
          {BLOG_SORTS.map((sort) => (
            <ToggleGroupItem className={SORT_CLASSNAME} id={sort} key={sort}>
              {t(`archive.sorts.${sort}`)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <ToggleGroup
        aria-label={t("archive.topics")}
        className="-mx-6 mt-4 w-auto max-w-none [scrollbar-width:none] flex-nowrap gap-2 overflow-x-auto px-6 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0"
        disallowEmptySelection
        onSelectionChange={(keys) => {
          update({ tag: BLOG_TAGS.find((tag) => keys.has(tag)) })
        }}
        selectedKeys={[view.tag ?? ALL_TOPICS]}
        selectionMode="single"
      >
        <ToggleGroupItem className={CHIP_CLASSNAME} id={ALL_TOPICS}>
          {t("archive.allTopics")}
        </ToggleGroupItem>
        {countBlogTags(posts).map(([tag, count]) => (
          <ToggleGroupItem aria-label={t("archive.topic", { count, topic: label(tag) })} className={CHIP_CLASSNAME} id={tag} key={tag}>
            {label(tag)}
            <span aria-hidden className="font-mono text-spec text-muted-foreground tabular-nums">
              {count}
            </span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {matches.length === 0 && <NoMatches onShowAll={showAll} />}

      {shown.length > 0 && (
        <HighlightGroup className="-mx-4 mt-10 divide-y divide-border border-y border-border md:-mx-6" name="blog-highlight">
          {shown.map((post) => (
            <PostRow isUpdated={view.sort === BLOG_SORT.UPDATED} key={post.url} post={post} />
          ))}
        </HighlightGroup>
      )}

      {shown.length < matches.length && (
        <div className="mt-10 flex flex-col items-center gap-4">
          <p className="font-mono text-spec text-muted-foreground tabular-nums">
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
