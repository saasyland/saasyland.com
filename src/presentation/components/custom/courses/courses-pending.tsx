import type { JSX } from "react"

import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import { PlayerPending } from "~/src/presentation/components/custom/courses/lesson-player"

const CARDS = ["first", "second"] as const
const CHAPTERS = ["first", "second", "third", "fourth"] as const
const LESSONS = ["first", "second", "third", "fourth", "fifth"] as const
const INCLUDES = ["first", "second", "third", "fourth", "fifth", "sixth"] as const

const BadgesPending = (): JSX.Element => (
  <div className="flex gap-2">
    <Skeleton className="h-6 w-16 rounded-md" />
    <Skeleton className="h-6 w-24 rounded-md" />
  </div>
)

const CardBodyPending = (): JSX.Element => (
  <>
    <Skeleton className="h-lh w-2/3 scale-y-75 text-headline-support" />
    <div className="mt-3 flex flex-col text-body">
      <Skeleton className="h-lh w-full scale-y-70" />
      <Skeleton className="h-lh w-3/5 scale-y-70" />
    </div>
    <Skeleton className="mt-6 h-lh w-56 scale-y-70 font-mono text-spec" />
  </>
)

const ChaptersPending = ({ compact }: { readonly compact: boolean }): JSX.Element => (
  <div className="border-y border-border">
    {CHAPTERS.map((chapter) => (
      <div className="flex gap-3 border-b border-border px-3 py-5 last:border-b-0" key={chapter}>
        <Skeleton className="h-lh w-5 scale-y-70 text-title" />
        <div className="flex min-w-0 flex-1 flex-col">
          <Skeleton className="h-lh w-3/5 scale-y-70 text-title" />
          {!compact && <Skeleton className="mt-1 h-lh w-48 scale-y-70 font-mono text-spec" />}
        </div>
      </div>
    ))}
  </div>
)

export const CataloguePending = (): JSX.Element => (
  <section aria-busy="true" className="relative">
    <div className="mx-auto w-full max-w-site px-6 py-24 md:px-10 md:py-32">
      <Skeleton className="h-lh w-full max-w-[14ch] scale-y-75 text-headline-peak" />
      <div className="mt-6 flex max-w-2xl flex-col text-lead">
        <Skeleton className="h-lh w-full scale-y-70" />
        <Skeleton className="h-lh w-3/5 scale-y-70" />
      </div>
      <div className="mt-14 grid overflow-hidden rounded-lg border border-border bg-card md:mt-20 lg:grid-cols-[1.4fr_1fr]">
        <Skeleton className="aspect-video w-full rounded-none" />
        <div className="p-7 md:p-10">
          <BadgesPending />
          <div className="mt-6">
            <CardBodyPending />
          </div>
        </div>
      </div>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {CARDS.map((card) => (
          <div className="overflow-hidden rounded-lg border border-border bg-card" key={card}>
            <Skeleton className="aspect-video w-full rounded-none" />
            <div className="p-6 md:p-8">
              <CardBodyPending />
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
)

export const CoursePending = (): JSX.Element => (
  <section aria-busy="true" className="relative">
    <div className="mx-auto grid w-full max-w-site px-6 pt-16 pb-24 md:px-10 md:pt-24 md:pb-32 lg:grid-cols-[minmax(0,1fr)_0.75rem_23rem] lg:gap-x-10 xl:gap-x-14">
      <div className="min-w-0">
        <Skeleton className="h-lh w-24 scale-y-70 text-body-sm" />
        <div className="mt-8">
          <BadgesPending />
        </div>
        <Skeleton className="mt-5 h-lh w-full max-w-[18ch] scale-y-75 text-display-gate" />
        <div className="mt-6 flex max-w-2xl flex-col text-lead">
          <Skeleton className="h-lh w-full scale-y-70" />
          <Skeleton className="h-lh w-2/5 scale-y-70" />
        </div>
        <Skeleton className="mt-6 h-lh w-72 scale-y-70 font-mono text-spec" />
        <Skeleton className="mt-16 h-lh w-40 scale-y-75 text-headline-support" />
        <div className="mt-8">
          <ChaptersPending compact={false} />
        </div>
      </div>
      <div aria-hidden className="max-lg:hidden" />
      <div className="mt-12 overflow-hidden rounded-lg border border-border bg-card lg:mt-0 lg:self-start">
        <Skeleton className="aspect-video w-full rounded-none" />
        <div className="flex flex-col gap-3 p-6">
          <Skeleton className="h-lh w-40 scale-y-70 text-title" />
          <Skeleton className="h-11 w-full rounded-md" />
        </div>
        <div className="flex flex-col gap-2.5 border-t border-border p-6 text-body-sm">
          {INCLUDES.map((item) => (
            <Skeleton className="h-lh w-4/5 scale-y-70" key={item} />
          ))}
        </div>
      </div>
    </div>
  </section>
)

export const LessonPending = (): JSX.Element => (
  <section aria-busy="true" className="relative">
    <div className="mx-auto grid w-full max-w-site gap-8 px-4 pt-6 pb-20 md:px-6 md:pt-8 lg:grid-cols-[18rem_minmax(0,1fr)] xl:gap-10">
      <div className="max-lg:hidden">
        <div className="px-3">
          <Skeleton className="h-lh w-16 scale-y-70 text-body-sm" />
          <Skeleton className="mt-1 h-lh w-4/5 scale-y-70 text-title" />
        </div>
        <div className="mt-6">
          <ChaptersPending compact />
        </div>
        <div className="mt-2 flex flex-col gap-3 px-3 text-body-sm">
          {LESSONS.map((lesson) => (
            <Skeleton className="h-lh w-4/5 scale-y-70" key={lesson} />
          ))}
        </div>
      </div>
      <div className="min-w-0">
        <PlayerPending />
        <div className="mt-3 flex items-center justify-between gap-2 border-b border-border pb-3">
          <Skeleton className="h-8 w-36 rounded-md" />
          <Skeleton className="h-8 w-44 rounded-md" />
        </div>
        <div className="mx-auto max-w-3xl pt-10">
          <Skeleton className="h-lh w-full max-w-[22ch] scale-y-75 text-headline-peak" />
          <Skeleton className="mt-4 h-lh w-44 scale-y-70 font-mono text-label" />
          <div className="mt-6 flex flex-col text-lead">
            <Skeleton className="h-lh w-full scale-y-70" />
            <Skeleton className="h-lh w-1/2 scale-y-70" />
          </div>
        </div>
      </div>
    </div>
  </section>
)
