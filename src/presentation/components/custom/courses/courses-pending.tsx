import type { JSX } from "react"

import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import { PlayerPending } from "~/src/presentation/components/custom/courses/lesson-player"

const CARDS = ["first", "second"] as const
const LESSONS = ["first", "second", "third", "fourth", "fifth", "sixth"] as const

const LessonRowsPending = (): JSX.Element => (
  <div className="flex flex-col gap-3">
    <Skeleton className="h-lh w-32 scale-y-70 font-mono text-label" />
    <div className="border-t border-border">
      {LESSONS.map((lesson) => (
        <div className="flex items-baseline gap-4 border-b border-border py-3.5" key={lesson}>
          <Skeleton className="h-lh w-5 scale-y-70 font-mono text-spec" />
          <Skeleton className="h-lh flex-1 scale-y-70 text-body-sm" />
          <Skeleton className="h-lh w-10 scale-y-70 font-mono text-spec" />
        </div>
      ))}
    </div>
  </div>
)

export const CataloguePending = (): JSX.Element => (
  <section aria-busy="true" className="relative">
    <div className="mx-auto w-full max-w-7xl px-6 py-24 md:px-10 md:py-32">
      <Skeleton className="h-lh w-full max-w-[14ch] scale-y-75 text-headline-peak" />
      <div className="mt-5 flex max-w-2xl flex-col text-lead">
        <Skeleton className="h-lh w-full scale-y-70" />
        <Skeleton className="h-lh w-3/5 scale-y-70" />
      </div>
      <div className="mt-14 grid gap-6 md:mt-20 lg:grid-cols-2">
        {CARDS.map((card) => (
          <Skeleton className="h-72 w-full rounded-xl" key={card} />
        ))}
      </div>
    </div>
  </section>
)

export const CoursePending = (): JSX.Element => (
  <section aria-busy="true" className="relative">
    <div className="mx-auto grid w-full max-w-7xl gap-14 px-6 py-24 md:px-10 md:py-32 lg:grid-cols-[1fr_22rem]">
      <div>
        <Skeleton className="h-lh w-28 scale-y-70 font-mono text-label" />
        <Skeleton className="mt-4 h-lh w-full max-w-[18ch] scale-y-75 text-headline-peak" />
        <Skeleton className="mt-5 h-lh w-full max-w-2xl scale-y-70 text-lead" />
        <div className="mt-14">
          <LessonRowsPending />
        </div>
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  </section>
)

export const LessonPending = (): JSX.Element => (
  <section aria-busy="true" className="relative">
    <div className="mx-auto grid w-full max-w-7xl gap-12 px-6 py-12 md:px-10 md:py-16 lg:grid-cols-[1fr_22rem]">
      <div>
        <PlayerPending />
        <Skeleton className="mt-8 h-lh w-40 scale-y-70 font-mono text-label" />
        <Skeleton className="mt-3 h-lh w-full max-w-[24ch] scale-y-75 text-headline-support" />
        <Skeleton className="mt-4 h-lh w-full max-w-2xl scale-y-70 text-body" />
      </div>
      <LessonRowsPending />
    </div>
  </section>
)
