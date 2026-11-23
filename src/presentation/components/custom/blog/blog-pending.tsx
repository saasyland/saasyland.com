import type { JSX, ReactNode } from "react"

import { useRouterState } from "@tanstack/react-router"

import { deLocalizePathname } from "~/src/integrations/use-intl/i18n.paths"

import {
  AUTHOR_PROFILE,
  BLOG_ARCHIVE,
  BLOG_FINDER_CLASSES,
  BLOG_FINDER_TOPICS,
  BLOG_HIGHLIGHTS,
  BLOG_SORTS,
  FEATURED_BLOG_POSTS,
} from "~/src/data/blog"

import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import { ContentPagePending } from "~/src/presentation/components/custom/content-page"

import { ROUTES } from "~/src/routes"

const ROWS = Array.from({ length: BLOG_ARCHIVE.PAGE_SIZE }, (_, index) => index)
const SIDE_POSTS = FEATURED_BLOG_POSTS.slice(1)
const LATEST = Array.from({ length: BLOG_HIGHLIGHTS.LATEST }, (_, index) => index)
const UPDATED = Array.from({ length: BLOG_HIGHLIGHTS.UPDATED }, (_, index) => index)
const TOPICS = Array.from({ length: BLOG_FINDER_TOPICS + 1 }, (_, index) => index)
const PARAGRAPHS = ["first", "second", "third", "fourth"] as const
const CONTENTS = ["first", "second", "third", "fourth", "fifth", "sixth"] as const
const RAIL_POSTS = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth"] as const
const SHARE_CONTROLS = ["copy", "x", "linkedin", "bluesky", "hackerNews", "reddit", "email", "native"] as const
const AUTHOR_PROFILES = Object.values(AUTHOR_PROFILE)
const ARCHIVE_PREFIX = `${ROUTES.BLOG}/${BLOG_ARCHIVE.PAGE_SEGMENT}/`

const FeedLinkPending = (): JSX.Element => (
  <div className="mt-6 flex py-1.5 text-label">
    <Skeleton className="h-lh w-28 scale-y-70" />
  </div>
)

const FactsPending = (): JSX.Element => <Skeleton className="h-lh w-44 scale-y-70 text-spec" />

const LabelPending = (): JSX.Element => <Skeleton className="h-lh w-24 scale-y-70 text-label" />

const RailPending = ({ rows }: { readonly rows: readonly string[] }): JSX.Element => (
  <div className="mt-4 flex flex-col">
    {rows.map((item) => (
      <div className="border-l border-border py-1.5 pl-4 text-body-sm" key={item}>
        <Skeleton className="h-lh w-full scale-y-70" />
        <Skeleton className="h-lh w-2/3 scale-y-70" />
      </div>
    ))}
  </div>
)

const PostFinderPending = (): JSX.Element => (
  <div className={BLOG_FINDER_CLASSES.BAR}>
    <div className={BLOG_FINDER_CLASSES.PANEL}>
      <div className="flex items-center gap-2">
        <Skeleton className="h-10 min-w-0 flex-1 rounded-md" />
        <Skeleton className="h-10 w-28 rounded-md lg:hidden" />
      </div>
      <div className={BLOG_FINDER_CLASSES.BODY}>
        <div className="shrink-0">
          <LabelPending />
          <div className="mt-3 flex flex-col">
            {BLOG_SORTS.map((sort) => (
              <div className="border-l border-border py-1.5 pl-4 text-body-sm" key={sort}>
                <Skeleton className="h-lh w-1/2 scale-y-70" />
              </div>
            ))}
          </div>
        </div>
        <div className="shrink-0">
          <LabelPending />
          <div className="mt-3 flex flex-col">
            {TOPICS.map((topic) => (
              <div className="border-l border-border py-1.5 pl-4 text-body-sm" key={topic}>
                <Skeleton className="h-lh w-3/4 scale-y-70" />
              </div>
            ))}
            <div className="border-l border-border py-1.5 pl-4 text-body-sm">
              <Skeleton className="h-lh w-2/3 scale-y-70" />
            </div>
          </div>
        </div>
        <div className={BLOG_FINDER_CLASSES.INDEX}>
          <LabelPending />
          <div className="min-h-0 flex-1 overflow-hidden">
            <RailPending rows={RAIL_POSTS} />
          </div>
        </div>
      </div>
    </div>
  </div>
)

const PostFinderLayoutPending = ({ children }: { readonly children: ReactNode }): JSX.Element => (
  <div className={BLOG_FINDER_CLASSES.LAYOUT}>
    <PostFinderPending />
    <div className={BLOG_FINDER_CLASSES.MAIN}>{children}</div>
  </div>
)

const PostRowsPending = ({ className }: { readonly className?: string }): JSX.Element => (
  <div className={className}>
    <div className="-mx-4 divide-y divide-border border-y border-border md:-mx-6">
      {ROWS.map((row) => (
        <div className="grid gap-x-10 gap-y-2 px-4 py-7 md:grid-cols-[10rem_1fr] md:px-6 md:py-8" key={row}>
          <div className="flex flex-col text-spec">
            <Skeleton className="h-lh w-24 scale-y-70" />
            <Skeleton className="mt-1 h-lh w-20 scale-y-70" />
          </div>
          <div className="min-w-0">
            <Skeleton className="h-lh w-3/5 scale-y-70 text-title" />
            <div className="mt-2 flex max-w-[68ch] flex-col text-body">
              <Skeleton className="h-lh w-full scale-y-70" />
              <Skeleton className="h-lh w-full scale-y-70" />
              <Skeleton className="h-lh w-2/5 scale-y-70" />
            </div>
            <Skeleton className="mt-4 h-lh w-80 max-w-full scale-y-70 text-label" />
          </div>
        </div>
      ))}
    </div>
  </div>
)

const RecentListPending = ({ rows }: { readonly rows: readonly number[] }): JSX.Element => (
  <div>
    <Skeleton className="h-lh w-40 scale-y-75 text-headline-support" />
    <div className="mt-6 border-t border-border">
      {rows.map((row) => (
        <div className="border-b border-border py-5" key={row}>
          <FactsPending />
          <Skeleton className="mt-2 h-lh w-4/5 scale-y-70 text-title" />
        </div>
      ))}
    </div>
  </div>
)

export const BlogIndexPending = (): JSX.Element => (
  <ContentPagePending>
    <FeedLinkPending />
    <PostFinderLayoutPending>
      <div className="flex flex-col gap-20 md:gap-28">
        <div>
          <Skeleton className="h-lh w-36 scale-y-75 text-headline-support" />
          <div className="mt-6 flex flex-col overflow-hidden rounded-lg border border-border bg-card xl:grid xl:grid-cols-[1.3fr_1fr]">
            <Skeleton className="aspect-[2.4/1] rounded-none xl:aspect-auto xl:h-full" />
            <div className="flex flex-col p-7 md:p-10">
              <FactsPending />
              <div className="mt-5 flex flex-col text-headline-support">
                <Skeleton className="h-lh w-full scale-y-75" />
                <Skeleton className="h-lh w-2/3 scale-y-75" />
              </div>
              <div className="mt-4 flex flex-col text-body">
                <Skeleton className="h-lh w-full scale-y-70" />
                <Skeleton className="h-lh w-full scale-y-70" />
                <Skeleton className="h-lh w-1/2 scale-y-70" />
              </div>
              <Skeleton className="mt-6 h-lh w-56 scale-y-70 text-label" />
            </div>
          </div>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {SIDE_POSTS.map((post) => (
              <div className="overflow-hidden rounded-lg border border-border bg-card" key={post}>
                <Skeleton className="aspect-[2.4/1] rounded-none" />
                <div className="p-6 md:p-8">
                  <FactsPending />
                  <Skeleton className="mt-4 h-lh w-4/5 scale-y-70 text-title md:text-lead" />
                  <div className="mt-3 flex flex-col text-body-sm">
                    <Skeleton className="h-lh w-full scale-y-70" />
                    <Skeleton className="h-lh w-2/3 scale-y-70" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-x-12 gap-y-14 md:grid-cols-2">
          <RecentListPending rows={LATEST} />
          <RecentListPending rows={UPDATED} />
        </div>
        <div className="border-t border-border pt-16 md:pt-20">
          <div className="flex items-baseline justify-between gap-6">
            <Skeleton className="h-lh w-36 scale-y-75 text-headline-support" />
            <Skeleton className="h-lh w-16 scale-y-70 text-spec" />
          </div>
          <PostRowsPending className="mt-10" />
        </div>
      </div>
    </PostFinderLayoutPending>
  </ContentPagePending>
)

export const BlogArchivePending = (): JSX.Element => (
  <ContentPagePending>
    <PostFinderLayoutPending>
      <PostRowsPending />
      <div className="mt-10 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <Skeleton className="h-11 w-40 rounded-lg" />
        <Skeleton className="h-lh w-24 scale-y-70 text-spec" />
      </div>
    </PostFinderLayoutPending>
  </ContentPagePending>
)

export const AuthorPending = (): JSX.Element => (
  <section aria-busy="true" className="relative">
    <div className="mx-auto w-full max-w-site px-6 py-20 md:px-10 md:py-28">
      <Skeleton className="h-lh w-24 scale-y-70 text-label" />

      <div className="mt-10 flex flex-col gap-8 md:flex-row md:items-start md:gap-12">
        <Skeleton className="size-28 shrink-0 rounded-full md:size-36" />
        <div className="flex min-w-0 flex-1 flex-col">
          <LabelPending />
          <Skeleton className="mt-3 h-lh w-full max-w-[14ch] scale-y-75 text-display-gate" />
          <Skeleton className="mt-4 h-lh w-full max-w-[36ch] scale-y-70 text-statement" />
          <div className="mt-5 flex max-w-[62ch] flex-col text-lead">
            <Skeleton className="h-lh w-full scale-y-70" />
            <Skeleton className="h-lh w-full scale-y-70" />
            <Skeleton className="h-lh w-2/5 scale-y-70" />
          </div>
          <div className="mt-6 flex items-center gap-1">
            {AUTHOR_PROFILES.map((profile) => (
              <Skeleton className="size-9 rounded-md" key={profile} />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-20 border-t border-border pt-16 md:mt-28 md:pt-20">
        <div className="flex items-baseline justify-between gap-6">
          <Skeleton className="h-lh w-64 max-w-full scale-y-75 text-headline-support" />
          <Skeleton className="h-lh w-16 scale-y-70 text-spec" />
        </div>
        <PostRowsPending className="mt-10" />
      </div>
    </div>
  </section>
)

export const BlogPostPending = (): JSX.Element => (
  <article aria-busy="true" className="relative">
    <div className="mx-auto w-full max-w-site px-6 py-20 md:px-10 md:py-28">
      <Skeleton className="h-lh w-24 scale-y-70 text-label" />

      <div className="mt-8 flex max-w-[24ch] flex-col text-display-gate">
        <Skeleton className="h-lh w-full scale-y-75" />
        <Skeleton className="h-lh w-2/3 scale-y-75" />
      </div>
      <div className="mt-6 flex max-w-[46ch] flex-col text-statement">
        <Skeleton className="h-lh w-full scale-y-70" />
        <Skeleton className="h-lh w-full scale-y-70" />
        <Skeleton className="h-lh w-1/2 scale-y-70" />
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-y border-border py-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 py-1 text-body-sm">
          <span className="size-1.25 shrink-0 rounded-full bg-border" />
          <Skeleton className="h-lh w-52 scale-y-70" />
          <Skeleton className="h-lh w-52 scale-y-70" />
          <Skeleton className="h-lh w-28 scale-y-70" />
          <Skeleton className="h-lh w-20 scale-y-70" />
          <Skeleton className="h-lh w-56 scale-y-70" />
        </div>
        <div className="flex items-center gap-x-3">
          <Skeleton className="h-lh w-12 scale-y-70 text-label" />
          <div className="flex items-center gap-1">
            {SHARE_CONTROLS.map((control) => (
              <Skeleton className="size-8 rounded-md" key={control} />
            ))}
          </div>
        </div>
      </div>

      <Skeleton className="mt-10 aspect-[2.4/1] w-full rounded-lg border border-border" />

      <div className="mt-14 grid gap-x-16 lg:grid-cols-[minmax(0,72ch)_1fr] xl:grid-cols-[13rem_minmax(0,1fr)_15rem] xl:gap-x-12">
        <div className="hidden xl:block">
          <Skeleton className="h-lh w-20 scale-y-70 text-label" />
          <RailPending rows={RAIL_POSTS} />
        </div>
        <div className="flex min-w-0 flex-col gap-6 text-lg/[1.72]">
          {PARAGRAPHS.map((paragraph) => (
            <div className="flex flex-col" key={paragraph}>
              <Skeleton className="h-lh w-full scale-y-70" />
              <Skeleton className="h-lh w-full scale-y-70" />
              <Skeleton className="h-lh w-2/5 scale-y-70" />
            </div>
          ))}
        </div>
        <div className="hidden lg:block">
          <Skeleton className="h-lh w-20 scale-y-70 text-label" />
          <div className="mt-4 flex flex-col">
            {CONTENTS.map((item) => (
              <div className="border-l border-border py-1.5 pl-4 text-body-sm" key={item}>
                <Skeleton className="h-lh w-3/4 scale-y-70" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </article>
)

export const BlogPending = (): JSX.Element => {
  const pathname = useRouterState({ select: (state) => deLocalizePathname(state.location.pathname) })

  if (pathname === ROUTES.BLOG) {
    return <BlogIndexPending />
  }

  if (pathname.startsWith(ARCHIVE_PREFIX)) {
    return <BlogArchivePending />
  }

  return <BlogPostPending />
}
