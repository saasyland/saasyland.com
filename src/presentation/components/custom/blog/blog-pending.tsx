import type { JSX } from "react"

import { useRouterState } from "@tanstack/react-router"

import { deLocalizePathname } from "~/src/integrations/use-intl/i18n.paths"

import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import { ContentPagePending } from "~/src/presentation/components/custom/content-page"

import { ROUTES } from "~/src/routes"

const POSTS = ["first", "second", "third", "fourth"] as const
const PARAGRAPHS = ["first", "second", "third", "fourth"] as const
const CONTENTS = ["first", "second", "third", "fourth", "fifth", "sixth"] as const
const SHARE_CONTROLS = ["copy", "x", "linkedin", "bluesky", "hackerNews", "reddit", "email", "native"] as const

export const BlogIndexPending = (): JSX.Element => (
  <ContentPagePending>
    <div className="mt-6 flex py-1.5 font-mono text-label">
      <Skeleton className="h-lh w-28 scale-y-70" />
    </div>
    <div className="mt-10 md:mt-14">
      <div className="-mx-4 divide-y divide-border border-y border-border md:-mx-6">
        {POSTS.map((post) => (
          <div className="grid gap-x-10 gap-y-2 px-4 py-7 md:grid-cols-[10rem_1fr] md:px-6 md:py-8" key={post}>
            <div className="flex flex-col font-mono text-spec">
              <Skeleton className="h-lh w-24 scale-y-70" />
              <Skeleton className="mt-1 h-lh w-20 scale-y-70" />
            </div>
            <div className="min-w-0">
              <Skeleton className="h-lh w-3/5 scale-y-70 text-title" />
              <div className="mt-2 flex max-w-[68ch] flex-col text-body">
                <Skeleton className="h-lh w-full scale-y-70" />
                <Skeleton className="h-lh w-full scale-y-70" />
                <Skeleton className="h-lh w-1/4 scale-y-70" />
              </div>
              <Skeleton className="mt-4 h-lh w-80 max-w-full scale-y-70 font-mono text-label" />
            </div>
          </div>
        ))}
      </div>
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

      <div className="mt-14 grid gap-x-16 lg:grid-cols-[minmax(0,72ch)_1fr]">
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
  const isIndex = useRouterState({ select: (state) => deLocalizePathname(state.location.pathname) === ROUTES.BLOG })

  if (isIndex) {
    return <BlogIndexPending />
  }

  return <BlogPostPending />
}
