import type { JSX } from "react"

import { useRouterState } from "@tanstack/react-router"

import { deLocalizePathname } from "~/src/integrations/use-intl/i18n.paths"

import { cn } from "~/src/lib/cn"

import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import { ROUTES } from "~/src/routes"

const NAV_WIDTHS = ["w-28", "w-16", "w-24", "w-22", "w-18", "w-20", "w-26", "w-19", "w-17", "w-21"]
const LIST_WIDTHS = ["w-full", "w-11/12", "w-4/5", "w-5/6"]
const TOC_WIDTHS = ["w-20", "w-24", "w-28"]

const DocsArticle = ({ breadcrumb }: { readonly breadcrumb: boolean }): JSX.Element => (
  <div className="mx-auto flex w-full max-w-225 flex-col px-4 pt-6 md:px-6 md:pt-8 xl:px-8 xl:pt-14">
    {breadcrumb && <Skeleton className="mb-4 h-lh w-16 scale-y-70 text-sm" />}
    <Skeleton className="h-lh w-2/5 scale-y-70 text-[1.75rem]/[1.5]" />
    <div className="mt-4 flex flex-col text-lg">
      <Skeleton className="h-lh w-full scale-y-70" />
      <Skeleton className="h-lh w-1/2 scale-y-70" />
    </div>
    <Skeleton className="mt-12 h-11.5 w-full rounded-lg border border-border bg-transparent xl:hidden" />
    <div className="mt-4 flex flex-col text-base/7 xl:mt-12">
      <Skeleton className="h-lh w-full scale-y-70" />
      <Skeleton className="h-lh w-3/4 scale-y-70" />
    </div>
    <div className="mt-5 flex flex-col gap-2 pl-5 text-base/7">
      {LIST_WIDTHS.map((width) => (
        <Skeleton className={cn("h-lh scale-y-70", width)} key={width} />
      ))}
    </div>
    <Skeleton className="mt-5 h-72 w-full rounded-xl border border-border bg-transparent" />
    <Skeleton className="mt-12 h-lh w-1/3 scale-y-70 text-2xl" />
    <div className="mt-6 flex flex-col text-base/7">
      <Skeleton className="h-lh w-full scale-y-70" />
      <Skeleton className="h-lh w-full scale-y-70" />
      <Skeleton className="h-lh w-2/5 scale-y-70" />
    </div>
  </div>
)

const DocsTableOfContents = (): JSX.Element => (
  <>
    <div className="flex items-center gap-2">
      <Skeleton className="size-4" />
      <Skeleton className="h-lh w-22 scale-y-70" />
    </div>
    <div className="mt-3 flex flex-col gap-1.5 border-l border-border pl-5">
      {TOC_WIDTHS.map((width) => (
        <Skeleton className={cn("h-lh scale-y-70", width)} key={width} />
      ))}
    </div>
  </>
)

const DocsContentPending = ({ breadcrumb }: { readonly breadcrumb: boolean }): JSX.Element => (
  <>
    <main aria-busy="true" className="grid justify-items-center [grid-area:main]">
      <DocsArticle breadcrumb={breadcrumb} />
    </main>
    <div className="sticky top-(--fd-docs-row-1) flex h-[calc(var(--fd-docs-height)-var(--fd-docs-row-1))] w-(--fd-toc-width) flex-col pe-4 pt-12 pb-2 text-sm [grid-area:toc] max-xl:hidden xl:layout:[--fd-toc-width:var(--container-docs-toc)]">
      <DocsTableOfContents />
    </div>
  </>
)

export const DocsIndexPending = (): JSX.Element => <DocsContentPending breadcrumb={false} />

export const DocsPagePending = (): JSX.Element => <DocsContentPending breadcrumb />

export const DocsPending = (): JSX.Element => {
  const isIndex = useRouterState({ select: (state) => deLocalizePathname(state.location.pathname) === ROUTES.DOCS })

  return (
    <div aria-busy="true" className="mx-auto flex min-h-dvh w-full max-w-site pt-header md:px-10">
      <div className="sticky top-header hidden h-[calc(100dvh-var(--spacing-header))] w-docs-sidebar shrink-0 flex-col border-x border-sidebar-border bg-sidebar md:flex">
        <div className="flex flex-col gap-3 p-4 pb-2">
          <div className="flex h-lh items-center text-[0.9375rem]">
            <Skeleton className="h-lh w-20 scale-y-70" />
          </div>
          <div className="flex h-9 items-center gap-2 rounded-lg border border-border px-2.5 text-sm">
            <Skeleton className="size-4 rounded-full" />
            <Skeleton className="h-lh w-14 scale-y-70" />
            <Skeleton className="ml-auto h-5 w-10 rounded-md" />
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-0.5 overflow-hidden px-4 pt-4 text-sm">
          <div className="mb-4.5 flex h-9 items-center gap-2 px-2">
            <Skeleton className="size-4 rounded-full" />
            <Skeleton className="h-lh w-40 scale-y-70" />
          </div>
          {NAV_WIDTHS.map((width) => (
            <div className="flex h-9 shrink-0 items-center gap-2 px-2" key={width}>
              <Skeleton className="size-4" />
              <Skeleton className={cn("h-lh scale-y-70", width)} />
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2 p-4 pt-2">
          <Skeleton className="h-9 w-full rounded-lg border border-border bg-transparent" />
          <Skeleton className="h-9 w-full rounded-lg border border-border bg-transparent" />
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-12 shrink-0 items-center gap-1 border-b px-1 md:hidden">
          <Skeleton className="m-3.25 size-4.5" />
          <Skeleton className="h-lh w-32 scale-y-70 text-sm" />
          <Skeleton className="m-3.25 ml-auto size-4.5" />
        </div>
        <DocsArticle breadcrumb={!isIndex} />
      </div>
      <div className="sticky top-header hidden h-[calc(100dvh-var(--spacing-header))] w-docs-toc shrink-0 flex-col pt-12 pr-4 text-sm xl:flex">
        <DocsTableOfContents />
      </div>
    </div>
  )
}
