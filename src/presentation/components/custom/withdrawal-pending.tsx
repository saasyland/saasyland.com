import type { JSX } from "react"

import { Card, CardContent, CardHeader } from "~/src/presentation/components/shadcn/card"
import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import { ContentPagePending } from "~/src/presentation/components/custom/content-page"

const STATEMENT_FIELDS = ["name", "email", "reference"] as const

const WithdrawalFormPending = (): JSX.Element => (
  <div className="flex flex-col gap-6">
    <Skeleton className="h-20 w-full rounded-lg" />
    <div className="flex flex-col gap-7">
      {STATEMENT_FIELDS.map((field) => (
        <div className="flex flex-col gap-3" key={field}>
          <Skeleton className="h-lh w-32 scale-y-70 text-sm" />
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
      ))}
    </div>
    <Skeleton className="h-9 w-40 rounded-md" />
  </div>
)

export const WithdrawalPending = (): JSX.Element => (
  <ContentPagePending>
    <div className="mt-12 flex max-w-3xl flex-col gap-8">
      <div className="flex flex-col text-sm leading-relaxed">
        <Skeleton className="h-lh w-full scale-y-70" />
        <Skeleton className="h-lh w-full scale-y-70" />
        <Skeleton className="h-lh w-full scale-y-70" />
        <Skeleton className="h-lh w-1/2 scale-y-70" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-lh w-56 scale-y-70 text-base leading-snug" />
        </CardHeader>
        <CardContent>
          <WithdrawalFormPending />
        </CardContent>
      </Card>
      <Skeleton className="h-lh w-72 max-w-full scale-y-70 text-sm" />
    </div>
  </ContentPagePending>
)
