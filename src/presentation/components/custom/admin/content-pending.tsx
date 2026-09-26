import type { JSX } from "react"

import {
  ADMIN_BLOG_FILTERS,
  ADMIN_BLOG_TOOLBAR_GROUPS,
  ADMIN_BLOG_TRENDING_STATS,
  ADMIN_BLOG_VIEWS,
  DUMMY_POSTS,
} from "~/src/data/admin-blog"
import {
  LANDING_PAGE_ACTIONS,
  LANDING_PAGE_ALIGNMENTS,
  LANDING_PAGE_BUTTONS,
  LANDING_PAGE_FEATURES,
  LANDING_PAGE_PADDINGS,
  LANDING_PAGE_SECTIONS,
  LANDING_PAGE_SECTION_ACTIONS,
  LANDING_PAGE_SURFACES,
  LANDING_PAGE_VIEWPORTS,
} from "~/src/data/admin-landing-page"

import { cn } from "~/src/lib/cn"

import { Card, CardContent } from "~/src/presentation/components/shadcn/card"
import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import {
  DescriptionPending,
  FieldPending,
  IconPending,
  TitlePending,
  UploadZonePending,
} from "~/src/presentation/components/custom/admin/pending-blocks"
import { backgroundGridPatternClassName } from "~/src/presentation/components/custom/background"

const PostCardPending = (): JSX.Element => (
  <div className="flex flex-col rounded-xl border border-border bg-card p-5">
    <div className="flex items-start justify-between gap-3">
      <Skeleton className="h-5 w-20 rounded-md" />
      <div className="-mt-1 -mr-1 size-7" />
    </div>
    <Skeleton className="mt-5 h-lh w-28 scale-y-70 font-mono text-label" />
    <div className="mt-2 flex flex-col text-title">
      <Skeleton className="h-lh w-full scale-y-70" />
      <Skeleton className="h-lh w-3/5 scale-y-70" />
    </div>
    <div className="mt-2 mb-6 flex flex-1 flex-col text-body-sm">
      <Skeleton className="h-lh w-full scale-y-70" />
      <Skeleton className="h-lh w-4/5 scale-y-70" />
    </div>
    <div className="mt-auto flex items-center justify-between border-t border-border pt-4 text-xs">
      <div className="flex items-center gap-2.5">
        <Skeleton className="size-6 rounded-md" />
        <Skeleton className="h-lh w-24 scale-y-70" />
      </div>
      <Skeleton className="h-lh w-24 scale-y-70" />
    </div>
  </div>
)

export const AdminBlogPending = (): JSX.Element => (
  <div aria-busy="true" className="flex w-full flex-col space-y-8 pb-8">
    <div>
      <TitlePending />
      <DescriptionPending />
    </div>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
      {ADMIN_BLOG_TRENDING_STATS.map((stat) => (
        <Card key={stat.key}>
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <Skeleton className="h-lh w-24 scale-y-70 text-xs" />
              <IconPending />
            </div>
            <Skeleton className="h-lh w-20 scale-y-70 text-headline-support" />
            <div className="mt-2 flex items-center gap-1.5 text-xs">
              <Skeleton className="size-3" />
              <Skeleton className="h-lh w-10 scale-y-70" />
            </div>
          </CardContent>
        </Card>
      ))}
      <Card>
        <CardContent className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <Skeleton className="h-lh w-24 scale-y-70 text-xs" />
            <IconPending />
          </div>
          <Skeleton className="h-lh w-14 scale-y-70 text-headline-support" />
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            <Skeleton className="h-lh w-24 scale-y-70" />
          </div>
        </CardContent>
      </Card>
    </div>
    <div className="flex w-full flex-col gap-2">
      <div className="flex flex-col gap-4 border-b border-border sm:flex-row sm:items-center sm:justify-between">
        <div className="no-scrollbar flex h-8 min-h-8 flex-1 items-center justify-start gap-6 overflow-x-auto p-[3px]">
          {ADMIN_BLOG_FILTERS.map((filter) => (
            <Skeleton className="h-lh w-16 shrink-0 scale-y-70 text-sm" key={filter} />
          ))}
        </div>
      </div>
      <div className="mt-6 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-28 rounded-lg" />
            <div className="flex items-center gap-1 rounded-md border border-border bg-muted/40 p-1">
              {ADMIN_BLOG_VIEWS.map((view) => (
                <Skeleton className="size-7 rounded-sm" key={view.id} />
              ))}
            </div>
          </div>
          <div className="relative flex-1">
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
          <div className="shrink-0">
            <Skeleton className="h-10 w-full rounded-lg sm:w-27" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {DUMMY_POSTS.map((post) => (
            <PostCardPending key={post.id} />
          ))}
        </div>
        <div className="flex justify-center pt-4">
          <Skeleton className="h-8 w-36 rounded-lg" />
        </div>
      </div>
    </div>
  </div>
)

const MonoFieldPending = (): JSX.Element => (
  <div className="flex w-full flex-col gap-2">
    <div>
      <Skeleton className="h-lh w-16 scale-y-70 font-mono text-label" />
      <Skeleton className="h-8 w-full rounded-lg" />
    </div>
  </div>
)

export const AdminBlogCreatePending = (): JSX.Element => (
  <div aria-busy="true" className="flex w-full flex-col space-y-8">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <TitlePending />
        <div className="mt-1 flex flex-col text-sm">
          <Skeleton className="h-lh w-96 max-w-full scale-y-70" />
          <Skeleton className="h-lh w-1/4 scale-y-70 sm:hidden" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-28 rounded-lg" />
        <Skeleton className="h-9 w-32 rounded-lg" />
        <Skeleton className="h-9 w-26 rounded-lg" />
      </div>
    </div>
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3 lg:gap-8">
      <div className="flex w-full flex-col gap-6 lg:col-span-2">
        <div className="flex w-full flex-col gap-2">
          <Skeleton className="h-lh w-18 scale-y-70 text-sm leading-snug" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
        <FieldPending />
        <Card className="flex h-125 flex-col overflow-hidden border-border bg-card">
          <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/40 p-2">
            {ADMIN_BLOG_TOOLBAR_GROUPS.map((group, groupIndex) => (
              <div className="flex items-center gap-1" key={group.id}>
                {groupIndex > 0 && <div className="mx-1 h-5 w-px bg-border/40" />}
                {group.tools.map((tool) => (
                  <div className="flex size-8 items-center justify-center" key={tool.id}>
                    <IconPending />
                  </div>
                ))}
              </div>
            ))}
            <div className="flex-1" />
            <div className="flex h-8 items-center gap-2 px-2.5 text-sm">
              <IconPending />
              <Skeleton className="h-lh w-17 scale-y-70" />
            </div>
          </div>
          <div className="flex-1 p-6">
            <Skeleton className="h-lh w-86 max-w-full scale-y-70 text-sm" />
          </div>
        </Card>
      </div>
      <div className="space-y-6 lg:col-span-1">
        <Card className="border-border p-5 sm:p-6">
          <Skeleton className="mb-4 h-lh w-28 scale-y-70 text-sm" />
          <UploadZonePending />
        </Card>
        <Card className="border-border p-5 sm:p-6">
          <Skeleton className="mb-4 h-lh w-20 scale-y-70 text-sm" />
          <div className="flex w-full flex-col gap-4">
            <MonoFieldPending />
            <MonoFieldPending />
            <div className="flex w-full flex-col gap-2">
              <Skeleton className="h-lh w-10 scale-y-70 font-mono text-label" />
              <Skeleton className="h-8 w-full rounded-lg" />
            </div>
            <div className="flex w-full flex-col gap-2">
              <Skeleton className="h-lh w-14 scale-y-70 font-mono text-label" />
              <Skeleton className="h-24 w-full rounded-lg" />
            </div>
          </div>
        </Card>
      </div>
    </div>
  </div>
)

const LandingSectionsPanePending = (): JSX.Element => (
  <div className="flex w-full shrink-0 flex-col lg:h-full lg:w-64">
    <div className="shrink-0 border-b border-border px-4 py-4 font-mono text-label">
      <Skeleton className="h-lh w-22 scale-y-70" />
    </div>
    <div className="min-h-0 flex-1 divide-y divide-border overflow-hidden">
      {LANDING_PAGE_SECTIONS.map((section) => (
        <div className="flex h-11 items-center gap-3 px-4 text-body-sm" key={section.id}>
          <IconPending />
          <Skeleton className="h-lh w-28 scale-y-70" />
        </div>
      ))}
    </div>
  </div>
)

const LandingCanvasPanePending = (): JSX.Element => (
  <div className="flex min-h-0 min-w-0 flex-1 flex-col">
    <div className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-border px-3">
      <div className="flex items-center">
        {LANDING_PAGE_VIEWPORTS.map((viewport) => (
          <Skeleton
            className="h-9 w-11 rounded-none border-l border-background first:rounded-l-lg first:border-l-0 last:rounded-r-lg"
            key={viewport.id}
          />
        ))}
      </div>
      <div className="flex items-center gap-2 font-mono text-spec">
        <Skeleton className="size-1.5 rounded-none" />
        <Skeleton className="h-lh w-11 scale-y-70" />
      </div>
    </div>
    <div className="relative min-h-0 flex-1 bg-background">
      <div className={cn("pointer-events-none absolute inset-0", backgroundGridPatternClassName)} />
      <div className="relative h-full overflow-hidden p-4 lg:p-8">
        <div className="mx-auto max-w-4xl">
          <div className="relative border border-border bg-card px-6 py-14 sm:px-12">
            <Skeleton className="absolute -top-px -left-px h-6 w-26 rounded-none" />
            <div className="absolute top-3 right-3 flex divide-x divide-border border border-border">
              {LANDING_PAGE_SECTION_ACTIONS.map((action) => (
                <div className="flex size-9 items-center justify-center" key={action.id}>
                  <IconPending />
                </div>
              ))}
            </div>
            <div className="mx-auto flex max-w-2xl flex-col items-center">
              <Skeleton className="h-8.5 w-48 rounded-none" />
              <div className="mt-6 flex w-full flex-col items-center text-4xl leading-tight md:text-5xl">
                <Skeleton className="h-lh w-3/5 scale-y-70" />
                <Skeleton className="h-lh w-1/2 scale-y-70" />
                <Skeleton className="h-lh w-3/5 scale-y-70" />
              </div>
              <div className="mt-6 flex w-full flex-col items-center text-lg leading-relaxed">
                <Skeleton className="h-lh w-11/12 scale-y-70" />
                <Skeleton className="h-lh w-full scale-y-70" />
                <Skeleton className="h-lh w-full scale-y-70 sm:hidden" />
                <Skeleton className="h-lh w-full scale-y-70 sm:hidden" />
                <Skeleton className="h-lh w-11/12 scale-y-70" />
              </div>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Skeleton className="h-12 w-39 rounded-lg" />
                <Skeleton className="h-12 w-38 rounded-lg" />
              </div>
            </div>
          </div>
          <div className="relative flex items-center justify-center py-6">
            <span className="absolute inset-x-0 top-1/2 h-px bg-border" />
            <Skeleton className="relative h-8 w-39 rounded-lg" />
          </div>
          <div className="relative border border-border bg-card px-6 py-14 sm:px-12">
            <div className="mx-auto flex max-w-2xl flex-col items-center">
              <Skeleton className="h-lh w-80 max-w-full scale-y-70 text-2xl" />
              <div className="mt-3 flex w-full flex-col items-center text-body-sm">
                <Skeleton className="h-lh w-96 max-w-full scale-y-70" />
                <Skeleton className="h-lh w-1/3 scale-y-70 sm:hidden" />
              </div>
            </div>
            <div className="mt-10 grid grid-cols-1 gap-px border border-border bg-border md:grid-cols-3">
              {LANDING_PAGE_FEATURES.map((feature) => (
                <div className="flex h-36 flex-col bg-card p-5" key={feature.id}>
                  <IconPending />
                  <Skeleton className="mt-4 h-lh w-28 scale-y-70 text-body-sm" />
                  <span className={cn("mt-4 block h-1.5 bg-muted", feature.barWidths[0])} />
                  <span className={cn("mt-1.5 block h-1.5 bg-muted", feature.barWidths[1])} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
)

const LegendPending = (): JSX.Element => (
  <legend className="mb-3 font-mono text-base">
    <Skeleton className="h-lh w-24 scale-y-70" />
  </legend>
)

const PropertyFieldPending = (): JSX.Element => (
  <div className="flex w-full flex-col gap-2">
    <Skeleton className="h-lh w-20 scale-y-70 text-xs leading-snug" />
    <Skeleton className="h-8 w-full rounded-lg" />
  </div>
)

const LandingPropertiesPanePending = (): JSX.Element => (
  <div className="flex w-full shrink-0 flex-col lg:h-full lg:w-80">
    <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-4">
      <div className="min-w-0">
        <Skeleton className="h-lh w-32 scale-y-70 text-body-sm" />
        <div className="mt-1 flex flex-col text-xs">
          <Skeleton className="h-lh w-24 scale-y-70" />
          <Skeleton className="hidden h-lh w-24 scale-y-70 lg:block" />
        </div>
      </div>
      <Skeleton className="h-6 w-26 shrink-0 rounded-sm" />
    </div>
    <div className="min-h-0 flex-1 divide-y divide-border overflow-hidden">
      <fieldset className="flex flex-col px-4 py-5">
        <LegendPending />
        <div className="flex w-full">
          {LANDING_PAGE_ALIGNMENTS.map((alignment) => (
            <Skeleton
              className="h-9 flex-1 rounded-none border-l border-background first:rounded-l-lg first:border-l-0 last:rounded-r-lg"
              key={alignment.id}
            />
          ))}
        </div>
      </fieldset>
      <fieldset className="flex flex-col px-4 py-5">
        <LegendPending />
        <div className="grid grid-cols-2 gap-3">
          {LANDING_PAGE_PADDINGS.map((padding) => (
            <PropertyFieldPending key={padding.id} />
          ))}
        </div>
      </fieldset>
      <fieldset className="flex flex-col px-4 py-5">
        <LegendPending />
        <div className="flex flex-wrap gap-2">
          <div className="flex">
            {LANDING_PAGE_SURFACES.map((surface) => (
              <Skeleton className="size-11 rounded-none border-l border-background first:border-l-0" key={surface.id} />
            ))}
          </div>
          <Skeleton className="size-11 rounded-none" />
        </div>
      </fieldset>
      <fieldset className="flex flex-col px-4 py-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <Skeleton className="h-lh w-20 scale-y-70 font-mono text-base" />
          <div className="flex items-center gap-1.5 text-xs">
            <Skeleton className="size-3.5" />
            <Skeleton className="h-lh w-24 scale-y-70" />
          </div>
        </div>
        <div className="flex w-full flex-col gap-4">
          <PropertyFieldPending />
          <div className="flex w-full flex-col gap-2">
            <Skeleton className="h-lh w-14 scale-y-70 text-xs leading-snug" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>
          <div className="flex w-full flex-col gap-2">
            <Skeleton className="h-lh w-18 scale-y-70 text-xs leading-snug" />
            <Skeleton className="h-28 w-full rounded-lg" />
          </div>
        </div>
      </fieldset>
      <fieldset className="flex flex-col px-4 py-5">
        <LegendPending />
        <div className="flex w-full flex-col gap-3">
          {LANDING_PAGE_BUTTONS.map((button) => (
            <div className="space-y-3 border border-border bg-background p-3" key={button.id}>
              <div className="flex w-full items-center gap-2">
                <Skeleton className="h-lh w-24 scale-y-70 text-xs" />
                <Skeleton className="ml-auto h-3.5 w-6 rounded-full" />
              </div>
              <PropertyFieldPending />
            </div>
          ))}
        </div>
      </fieldset>
    </div>
  </div>
)

export const AdminLandingPagePending = (): JSX.Element => (
  <div aria-busy="true" className="flex min-h-0 w-full flex-1 flex-col pb-4">
    <div className="mb-6 flex shrink-0 flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <TitlePending />
        <div className="mt-0.5 flex max-w-2xl flex-col text-body-sm">
          <Skeleton className="h-lh w-112 max-w-full scale-y-70" />
          <Skeleton className="h-lh w-1/3 scale-y-70 sm:hidden" />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {LANDING_PAGE_ACTIONS.map((action) => (
          <Skeleton className="h-9 w-24 rounded-lg" key={action.id} />
        ))}
      </div>
    </div>
    <div className="flex min-h-0 flex-1 flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-card lg:flex-row lg:divide-x lg:divide-y-0">
      <LandingSectionsPanePending />
      <LandingCanvasPanePending />
      <LandingPropertiesPanePending />
    </div>
  </div>
)
