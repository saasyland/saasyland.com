import type { JSX } from "react"

import { useQueryClient } from "@tanstack/react-query"

import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { catalogueQuery } from "~/src/modules/course/use-cases/get-catalogue"

import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

export const CourseUnlocksPending = (): JSX.Element | undefined => {
  const queryClient = useQueryClient()

  const catalogue = queryClient.getQueryData(catalogueQuery({ locale: getCurrentLocale() }).queryKey)
  const courses = catalogue?.courses.filter(({ paid }) => paid > 0).length ?? 0

  if (courses === 0) {
    return undefined
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6 md:p-8">
      <Skeleton className="h-lh w-56 max-w-full scale-y-70 text-title" />
      <div className="mt-1.5 flex w-full flex-col text-body-sm">
        <Skeleton className="h-lh w-full max-w-[60ch] scale-y-70" />
        <Skeleton className="h-lh w-2/3 scale-y-70 sm:hidden" />
      </div>
      <div className="mt-5 divide-y divide-border border-y border-border">
        {Array.from({ length: courses }, (_, course) => (
          <div className="flex items-center gap-3 py-3.5 text-body-sm" key={course}>
            <Skeleton className="size-3.5 shrink-0" />
            <Skeleton className="h-lh w-48 scale-y-70" />
          </div>
        ))}
      </div>
    </div>
  )
}
