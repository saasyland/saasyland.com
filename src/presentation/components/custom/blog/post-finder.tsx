import { type JSX, type ReactNode, useId, useState } from "react"

import { ChevronRight, SearchIcon, SlidersHorizontal, X } from "lucide-react"
import { Dialog, SearchField } from "react-aria-components"
import { useFormatter, useTranslations } from "use-intl/react"

import type { BlogPostSummary } from "~/src/integrations/fumadocs/fumadocs.blog"
import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { type BlogViewState, useBlogView } from "~/src/hooks/use-blog-view"

import { BLOG_FINDER_CLASSES, BLOG_FINDER_TOPICS, BLOG_SORT, BLOG_SORTS, BLOG_TAGS, type BlogTag } from "~/src/data/blog"

import { countBlogTags } from "~/src/lib/blog-archive"
import { cn } from "~/src/lib/cn"

import { Button } from "~/src/presentation/components/shadcn/button"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "~/src/presentation/components/shadcn/input-group"
import { Popover, PopoverTrigger } from "~/src/presentation/components/shadcn/popover"
import { Sheet, SheetClose, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "~/src/presentation/components/shadcn/sheet"
import { ToggleGroup, ToggleGroupItem } from "~/src/presentation/components/shadcn/toggle-group"

import { PostRailList } from "~/src/presentation/components/custom/blog/post-rail"

interface PostFinderProps {
  readonly locale: SupportedLocale
  readonly posts: readonly BlogPostSummary[]
}

interface FinderPartProps {
  readonly finder: BlogViewState
}

interface TopicOptionsProps extends FinderPartProps {
  readonly posts: readonly BlogPostSummary[]
}

interface TopicGroupProps extends TopicOptionsProps {
  readonly labelId: string
  readonly onPick: (tag: BlogTag | undefined) => void
  readonly topics: readonly (readonly [BlogTag, number])[]
}

interface FiltersSheetProps extends FinderPartProps {
  readonly onShowResults: () => void
  readonly posts: readonly BlogPostSummary[]
}

const ALL_TOPICS = "all"

const LABEL_CLASSNAME = "text-label text-muted-foreground uppercase"

const FOCUS_CLASSNAME =
  "focus-visible:border-transparent focus-visible:ring-0 data-focus-visible:outline-2 data-focus-visible:outline-solid data-focus-visible:outline-ring"

const OPTION_CLASSNAME = cn(
  "h-auto w-full min-w-0 cursor-pointer justify-between gap-3 rounded-none border-0 border-l border-border py-1.5 pr-1 pl-4 text-left text-body-sm font-normal whitespace-normal text-muted-foreground transition-colors duration-200 ease-exp hover:border-ring hover:bg-transparent hover:text-foreground data-focus-visible:-outline-offset-2 data-selected:border-ring data-selected:bg-transparent data-selected:text-foreground",
  FOCUS_CLASSNAME,
)

const Count = ({ children }: { readonly children: ReactNode }): JSX.Element => (
  <span aria-hidden className="text-spec text-muted-foreground tabular-nums">
    {children}
  </span>
)

const FilterChip = ({ name, onRemove }: { readonly name: string; readonly onRemove: () => void }): JSX.Element => {
  const t = useTranslations("pages.blog.archive")

  return (
    <Button
      aria-label={t("removeFilter", { filter: name })}
      className={cn(
        "h-7 shrink-0 cursor-pointer gap-1.5 rounded-full border-ring/50 bg-ring/10 px-2.5 text-body-sm font-normal text-foreground hover:bg-ring/15 dark:border-ring/50 dark:bg-ring/10 dark:hover:bg-ring/15",
        FOCUS_CLASSNAME,
        "data-focus-visible:outline-offset-2",
      )}
      onPress={onRemove}
      size="sm"
      variant="outline"
    >
      {name}
      <X aria-hidden className="size-3.5 text-muted-foreground" />
    </Button>
  )
}

const ActiveFilters = ({ finder }: FinderPartProps): JSX.Element | undefined => {
  const t = useTranslations("pages.blog.archive")

  const { clear, label, update, view } = finder

  if (view.tag === undefined && view.sort === BLOG_SORT.NEWEST) {
    return
  }

  return (
    <div
      aria-label={t("activeFilters")}
      className="-mx-6 mt-3 flex [scrollbar-width:none] items-center gap-2 overflow-x-auto px-6 md:-mx-10 md:px-10 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0"
      data-active-filters
      role="group"
    >
      {view.tag !== undefined && (
        <FilterChip
          name={label(view.tag)}
          onRemove={() => {
            update({ tag: undefined })
          }}
        />
      )}
      {view.sort !== BLOG_SORT.NEWEST && (
        <FilterChip
          name={t(`sorts.${view.sort}`)}
          onRemove={() => {
            update({ sort: BLOG_SORT.NEWEST })
          }}
        />
      )}
      <Button
        className={cn(
          "h-7 shrink-0 cursor-pointer px-2 text-body-sm font-normal text-muted-foreground hover:text-foreground",
          FOCUS_CLASSNAME,
        )}
        onPress={clear}
        size="sm"
        variant="ghost"
      >
        {t("clearAll")}
      </Button>
    </div>
  )
}

const SortOptions = ({ finder }: FinderPartProps): JSX.Element => {
  const t = useTranslations("pages.blog.archive")
  const labelId = useId()

  return (
    <div className="shrink-0">
      <p className={LABEL_CLASSNAME} id={labelId}>
        {t("sort")}
      </p>
      <ToggleGroup
        aria-labelledby={labelId}
        className="mt-3 w-full gap-0"
        disallowEmptySelection
        onSelectionChange={(keys) => {
          for (const sort of BLOG_SORTS) {
            if (keys.has(sort)) {
              finder.update({ sort })
            }
          }
        }}
        orientation="vertical"
        selectedKeys={[finder.view.sort]}
        selectionMode="single"
      >
        {BLOG_SORTS.map((sort) => (
          <ToggleGroupItem className={OPTION_CLASSNAME} id={sort} key={sort}>
            {t(`sorts.${sort}`)}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}

const TopicGroup = ({ finder, labelId, onPick, posts, topics }: TopicGroupProps): JSX.Element => {
  const t = useTranslations("pages.blog.archive")

  const { label, view } = finder

  return (
    <ToggleGroup
      aria-labelledby={labelId}
      className="mt-3 w-full gap-0"
      disallowEmptySelection
      onSelectionChange={(keys) => {
        onPick(BLOG_TAGS.find((tag) => keys.has(tag)))
      }}
      orientation="vertical"
      selectedKeys={[view.tag ?? ALL_TOPICS]}
      selectionMode="single"
    >
      <ToggleGroupItem className={OPTION_CLASSNAME} id={ALL_TOPICS}>
        {t("allTopics")}
        <Count>{posts.length}</Count>
      </ToggleGroupItem>
      {topics.map(([tag, count]) => (
        <ToggleGroupItem aria-label={t("topic", { count, topic: label(tag) })} className={OPTION_CLASSNAME} id={tag} key={tag}>
          {label(tag)}
          <Count>{count}</Count>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

const TopicOptions = ({ finder, posts }: TopicOptionsProps): JSX.Element => {
  const t = useTranslations("pages.blog.archive")
  const labelId = useId()

  return (
    <div className="shrink-0">
      <p className={LABEL_CLASSNAME} id={labelId}>
        {t("topics")}
      </p>
      <TopicGroup
        finder={finder}
        labelId={labelId}
        onPick={(tag) => {
          finder.update({ tag })
        }}
        posts={posts}
        topics={countBlogTags(posts)}
      />
    </div>
  )
}

const TopicPreview = ({ finder, posts }: TopicOptionsProps): JSX.Element => {
  const t = useTranslations("pages.blog.archive")
  const labelId = useId()
  const allLabelId = useId()
  const [isOpen, setOpen] = useState(false)

  const topics = countBlogTags(posts)
  const chosen = topics.filter(([tag], index) => index >= BLOG_FINDER_TOPICS && tag === finder.view.tag)
  const shown = [...topics.slice(0, BLOG_FINDER_TOPICS - chosen.length), ...chosen]

  const pick = (tag: BlogTag | undefined): void => {
    finder.update({ tag })
  }

  return (
    <div className="shrink-0">
      <p className={LABEL_CLASSNAME} id={labelId}>
        {t("topics")}
      </p>
      <TopicGroup finder={finder} labelId={labelId} onPick={pick} posts={posts} topics={shown} />
      {topics.length > BLOG_FINDER_TOPICS && (
        <PopoverTrigger isOpen={isOpen} onOpenChange={setOpen}>
          <Button className={OPTION_CLASSNAME} variant="ghost">
            {t("moreTopics", { count: topics.length })}
            <ChevronRight aria-hidden className="text-muted-foreground" />
          </Button>
          <Popover className="w-64 p-0" placement="right top">
            <Dialog aria-labelledby={allLabelId} className="custom-scrollbar min-h-0 overflow-y-auto overscroll-contain p-4 outline-hidden">
              <p className={LABEL_CLASSNAME} id={allLabelId}>
                {t("topics")}
              </p>
              <TopicGroup
                finder={finder}
                labelId={allLabelId}
                onPick={(tag) => {
                  pick(tag)
                  setOpen(false)
                }}
                posts={posts}
                topics={topics}
              />
            </Dialog>
          </Popover>
        </PopoverTrigger>
      )}
    </div>
  )
}

const PostIndex = ({ finder, total }: FinderPartProps & { readonly total: number }): JSX.Element => {
  const t = useTranslations("pages.blog")
  const format = useFormatter()
  const titleId = useId()

  const { isFiltered, matches } = finder

  return (
    <nav aria-labelledby={titleId} className={BLOG_FINDER_CLASSES.INDEX}>
      <div className="flex shrink-0 items-baseline justify-between gap-3">
        <p className={LABEL_CLASSNAME} id={titleId}>
          {t("post.rail")}
        </p>
        <p className="text-spec text-muted-foreground tabular-nums">
          {!isFiltered && format.number(total)}
          {isFiltered && t("archive.indexCount", { shown: matches.length, total })}
        </p>
      </div>
      {matches.length > 0 && <PostRailList className={BLOG_FINDER_CLASSES.INDEX_LIST} posts={matches} />}
      {matches.length === 0 && (
        <p className="mt-3 border-l border-border py-1.5 pl-4 text-body-sm text-muted-foreground">{t("archive.matches", { count: 0 })}</p>
      )}
    </nav>
  )
}

const FiltersSheet = ({ finder, onShowResults, posts }: FiltersSheetProps): JSX.Element => {
  const t = useTranslations("pages.blog.archive")

  const { clear, isFiltered, matches, view } = finder
  const active = Number(view.tag !== undefined) + Number(view.sort !== BLOG_SORT.NEWEST)

  return (
    <SheetTrigger>
      <Button
        className={cn("h-10 cursor-pointer gap-2 px-3.5 text-body-sm lg:hidden", FOCUS_CLASSNAME, "data-focus-visible:outline-offset-2")}
        variant="outline"
      >
        <SlidersHorizontal aria-hidden />
        {t("filters")}
        {active > 0 && (
          <>
            <span
              aria-hidden
              className="inline-flex min-w-5 justify-center rounded-full bg-ring/15 px-1.5 text-spec text-foreground tabular-nums"
            >
              {active}
            </span>
            <span className="sr-only">{t("activeCount", { count: active })}</span>
          </>
        )}
      </Button>
      <Sheet className="max-h-[85dvh] gap-0 rounded-t-lg text-foreground md:mx-auto md:max-w-xl" side="bottom">
        <SheetHeader className="border-b border-border px-6 pt-5 pb-4">
          <SheetTitle className="text-title">{t("filters")}</SheetTitle>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto overscroll-contain px-6 py-6">
          <SortOptions finder={finder} />
          <TopicOptions finder={finder} posts={posts} />
        </div>
        <SheetFooter className="flex-row gap-3 border-t border-border px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button className="h-11 flex-1 cursor-pointer" isDisabled={!isFiltered && active === 0} onPress={clear} variant="outline">
            {t("clearAll")}
          </Button>
          <SheetClose className="h-11 flex-[2] cursor-pointer" onPress={onShowResults} variant="default">
            {t("showResults", { count: matches.length })}
          </SheetClose>
        </SheetFooter>
      </Sheet>
    </SheetTrigger>
  )
}

const PostFinder = ({ locale, posts }: PostFinderProps): JSX.Element => {
  const t = useTranslations("pages.blog.archive")
  const [draft, setDraft] = useState<string>()

  const finder = useBlogView({ locale, posts, query: draft })
  const [syncedQuery, setSyncedQuery] = useState(finder.view.q)

  if (finder.view.q !== syncedQuery) {
    setSyncedQuery(finder.view.q)
    if (finder.view.q === undefined) {
      setDraft(undefined)
    }
  }

  const query = draft ?? finder.view.q ?? ""

  const searchFor = (value: string): void => {
    if (value.trim().length === 0) {
      finder.update({ q: undefined })
      return
    }

    finder.update({ q: value })
  }

  return (
    <aside aria-label={t("finder")} className={BLOG_FINDER_CLASSES.BAR}>
      <div className={BLOG_FINDER_CLASSES.PANEL}>
        <div className="flex shrink-0 items-center gap-2">
          <SearchField
            aria-label={t("search")}
            className="min-w-0 flex-1"
            onChange={(value) => {
              setDraft(value)
              if (finder.isIndex) {
                searchFor(value)
              }
            }}
            onSubmit={searchFor}
            value={query}
          >
            <InputGroup className="h-10 bg-card/60 dark:bg-card/60">
              <InputGroupAddon>
                <SearchIcon aria-hidden className="size-4" />
              </InputGroupAddon>
              <InputGroupInput className="text-body-sm [&::-webkit-search-cancel-button]:hidden" placeholder={t("search")} />
              {query.length > 0 && (
                <InputGroupAddon align="inline-end">
                  <InputGroupButton aria-label={t("clearSearch")} size="icon-xs">
                    <X aria-hidden />
                  </InputGroupButton>
                </InputGroupAddon>
              )}
            </InputGroup>
          </SearchField>
          <FiltersSheet
            finder={finder}
            onShowResults={() => {
              searchFor(query)
            }}
            posts={posts}
          />
        </div>
        <ActiveFilters finder={finder} />
        <div className={BLOG_FINDER_CLASSES.BODY}>
          <SortOptions finder={finder} />
          <TopicPreview finder={finder} posts={posts} />
          <PostIndex finder={finder} total={posts.length} />
        </div>
      </div>
    </aside>
  )
}

export const PostFinderLayout = ({ children, locale, posts }: PostFinderProps & { readonly children: ReactNode }): JSX.Element => (
  <div className={BLOG_FINDER_CLASSES.LAYOUT}>
    <PostFinder locale={locale} posts={posts} />
    <div className={BLOG_FINDER_CLASSES.MAIN}>{children}</div>
  </div>
)
