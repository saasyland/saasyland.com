import type { JSX } from "react"

import { useRouterState } from "@tanstack/react-router"

import { deLocalizePathname } from "~/src/integrations/use-intl/i18n.paths"

import { BLOG_ARCHIVE, BLOG_HIGHLIGHTS, BLOG_SORTS, FEATURED_BLOG_POSTS } from "~/src/data/blog"

import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import { ContentPagePending } from "~/src/presentation/components/custom/content-page"

import { ROUTES } from "~/src/routes"

const ROWS = Array.from({ length: BLOG_ARCHIVE.PAGE_SIZE }, (_, index) => index)
const SIDE_POSTS = FEATURED_BLOG_POSTS.slice(1)
const LATEST = Array.from({ length: BLOG_HIGHLIGHTS.LATEST }, (_, index) => index)
const UPDATED = Array.from({ length: BLOG_HIGHLIGHTS.UPDATED }, (_, index) => index)
const TOPICS = ["all", "first", "second", "third", "fourth", "fifth", "sixth"] as const
const PARAGRAPHS = ["first", "second", "third", "fourth"] as const
const CONTENTS = ["first", "second", "third", "fourth", "fifth", "sixth"] as const
const RAIL_POSTS = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth"] as const
const SHARE_CONTROLS = ["copy", "x", "linkedin", "bluesky", "hackerNews", "reddit", "email", "native"] as const
const ARCHIVE_PREFIX = `${ROUTES.BLOG}/${BLOG_ARCHIVE.PAGE_SEGMENT}/`

const FeedLinkPending = (): JSX.Element => (
  <div className="mt-6 flex py-1.5 font-mono text-label">
    <Skeleton className="h-lh w-28 scale-y-70" />
  </div>
)

const FactsPending = (): JSX.Element => <Skeleton className="h-lh w-44 scale-y-70 font-mono text-spec" />

const PostRowsPending = ({ className }: { readonly className?: string }): JSX.Element => (
  <div className={className}>
    <div className="-mx-4 divide-y divide-border border-y border-border md:-mx-6">
      {ROWS.map((row) => (
        <div className="grid gap-x-10 gap-y-2 px-4 py-7 md:grid-cols-[10rem_1fr] md:px-6 md:py-8" key={row}>
          <div className="flex flex-col font-mono text-spec">
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
            <Skeleton className="mt-4 h-lh w-80 max-w-full scale-y-70 font-mono text-label" />
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
    <div className="mt-14 md:mt-20">
      <Skeleton className="h-lh w-36 scale-y-75 text-headline-support" />
      <div className="mt-6 flex flex-col overflow-hidden rounded-lg border border-border bg-card lg:grid lg:grid-cols-[1.4fr_1fr]">
        <Skeleton className="aspect-[2.4/1] rounded-none lg:aspect-auto lg:h-full" />
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
          <Skeleton className="mt-6 h-lh w-56 scale-y-70 font-mono text-label" />
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
    <div className="mt-20 grid gap-x-16 gap-y-14 md:mt-28 md:grid-cols-2">
      <RecentListPending rows={LATEST} />
      <RecentListPending rows={UPDATED} />
    </div>
    <div className="mt-20 border-t border-border pt-16 md:mt-28 md:pt-20">
      <div className="flex items-baseline justify-between gap-6">
        <Skeleton className="h-lh w-36 scale-y-75 text-headline-support" />
        <Skeleton className="h-lh w-16 scale-y-70 font-mono text-spec" />
      </div>
      <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <Skeleton className="h-10 w-full rounded-lg md:max-w-sm" />
        <div className="flex gap-1 rounded-lg border border-border p-1">
          {BLOG_SORTS.map((sort) => (
            <Skeleton className="h-8 flex-1 rounded-md sm:w-24 sm:flex-none" key={sort} />
          ))}
        </div>
      </div>
      <div className="mt-4 flex gap-2 overflow-hidden">
        {TOPICS.map((topic) => (
          <Skeleton className="h-8 w-24 shrink-0 rounded-full" key={topic} />
        ))}
      </div>
      <PostRowsPending className="mt-10" />
    </div>
  </ContentPagePending>
)

export const BlogArchivePending = (): JSX.Element => (
  <ContentPagePending>
    <PostRowsPending className="mt-10 md:mt-14" />
    <div className="mt-10 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
      <Skeleton className="h-11 w-40 rounded-lg" />
      <Skeleton className="h-lh w-24 scale-y-70 font-mono text-spec" />
    </div>
  </ContentPagePending>
)

export const BlogPostPending = (): JSX.Element => (
  <article aria-busy="true" className="relative">
    <div className="mx-auto w-full max-w-site px-6 py-20 md:px-10 md:py-28">
      <Skeleton className="h-lh w-24 scale-y-70 font-mono text-label" />

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
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 py-1 font-mono text-body-sm">
          <span className="size-1.25 shrink-0 rounded-full bg-border" />
          <Skeleton className="h-lh w-52 scale-y-70" />
          <Skeleton className="h-lh w-52 scale-y-70" />
          <Skeleton className="h-lh w-28 scale-y-70" />
          <Skeleton className="h-lh w-20 scale-y-70" />
          <Skeleton className="h-lh w-56 scale-y-70" />
        </div>
        <div className="flex items-center gap-x-3">
          <Skeleton className="h-lh w-12 scale-y-70 font-mono text-label" />
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
          <Skeleton className="h-lh w-20 scale-y-70 font-mono text-label" />
          <div className="mt-4 flex flex-col">
            {RAIL_POSTS.map((item) => (
              <div className="border-l border-border py-1.5 pl-4 text-body-sm" key={item}>
                <Skeleton className="h-lh w-full scale-y-70" />
                <Skeleton className="h-lh w-2/3 scale-y-70" />
              </div>
            ))}
          </div>
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
          <Skeleton className="h-lh w-20 scale-y-70 font-mono text-label" />
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
