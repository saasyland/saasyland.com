import { useHydrated, useMatch, useNavigate } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import type { BlogPostSummary } from "~/src/integrations/fumadocs/fumadocs.blog"
import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { BLOG_ARCHIVE, BLOG_SORT, type BlogSort, type BlogTag } from "~/src/data/blog"

import { filterBlogPosts, sortBlogPosts } from "~/src/lib/blog-archive"

import { ROUTES } from "~/src/routes"

export interface BlogView {
  readonly page?: number | undefined
  readonly q?: string | undefined
  readonly sort: BlogSort
  readonly tag?: BlogTag | undefined
}

interface BlogViewOptions {
  readonly locale: SupportedLocale
  readonly posts: readonly BlogPostSummary[]
  readonly query?: string | undefined
}

const STATIC_VIEW: BlogView = { sort: BLOG_SORT.NEWEST }

const CLEARED_VIEW = { q: undefined, sort: BLOG_SORT.NEWEST, tag: undefined } as const

const READING_ZONE_RATIO = 2

const PIXELS = "px"

const cssLength = (element: Element, property: "scrollMarginTop" | "scrollPaddingTop"): number =>
  Number(getComputedStyle(element)[property].replace(PIXELS, ""))

const revealArchive = (): void => {
  const archive = document.querySelector(`#${BLOG_ARCHIVE.SECTION_ID}`)
  if (archive === null) {
    return
  }

  const { top } = archive.getBoundingClientRect()
  const resting = cssLength(archive, "scrollMarginTop") + cssLength(document.documentElement, "scrollPaddingTop")
  if (Math.round(top) < Math.round(resting) || top > window.innerHeight / READING_ZONE_RATIO) {
    archive.scrollIntoView({ block: "start" })
  }
}

export interface BlogViewState {
  readonly clear: () => void
  readonly isFiltered: boolean
  readonly isIndex: boolean
  readonly label: (tag: BlogTag) => string
  readonly matches: BlogPostSummary[]
  readonly update: (next: Partial<BlogView>) => void
  readonly view: BlogView
}

export const useBlogView = ({ locale, posts, query }: BlogViewOptions): BlogViewState => {
  const t = useTranslations("pages.blog")
  const hydrated = useHydrated()
  const navigate = useNavigate()

  const search = useMatch({ from: "/_site/_marketing/blog/", select: (match) => match.search, shouldThrow: false })

  const view: BlogView = hydrated && search !== undefined ? search : STATIC_VIEW
  const text = query ?? view.q ?? ""
  const label = (tag: BlogTag): string => t(`tags.${tag}`)
  const matches = sortBlogPosts(filterBlogPosts({ label, locale, posts, query: text, tag: view.tag }), view.sort)

  const update = (next: Partial<BlogView>): void => {
    if (search === undefined) {
      void navigate({ hash: BLOG_ARCHIVE.SECTION_ID, search: { ...STATIC_VIEW, ...next }, to: ROUTES.BLOG.INDEX })
      return
    }

    revealArchive()
    void navigate({ replace: true, resetScroll: false, search: { ...search, page: undefined, ...next }, to: ROUTES.BLOG.INDEX })
  }

  return {
    clear: (): void => {
      update(CLEARED_VIEW)
    },
    isFiltered: text.trim().length > 0 || view.tag !== undefined,
    isIndex: search !== undefined,
    label,
    matches,
    update,
    view,
  }
}
