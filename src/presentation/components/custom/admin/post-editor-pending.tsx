import type { JSX } from "react"

import {
  ADMIN_BLOG_FILTERS,
  ADMIN_BLOG_TOOLBAR_GROUPS,
  ADMIN_BLOG_TRENDING_STATS,
  ADMIN_BLOG_VIEWS,
  DUMMY_POSTS,
} from "~/src/data/admin-blog"

import { Card, CardContent } from "~/src/presentation/components/shadcn/card"
import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import {
  DescriptionPending,
  FieldPending,
  IconPending,
  TitlePending,
  UploadZonePending,
} from "~/src/presentation/components/custom/admin/pending-blocks"

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
