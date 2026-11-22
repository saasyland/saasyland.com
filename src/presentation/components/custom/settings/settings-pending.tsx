import type { JSX } from "react"

import { SETTINGS_TABS } from "~/src/data/auth"

import { Card, CardContent, CardFooter, CardHeader } from "~/src/presentation/components/shadcn/card"
import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

const CardHeaderPending = ({ hasAction = false }: { readonly hasAction?: boolean }): JSX.Element => (
  <CardHeader className="border-b">
    <Skeleton className="h-lh w-28 scale-y-70 text-base leading-snug" />
    <Skeleton className="h-lh w-80 max-w-full scale-y-70 text-sm" />
    {hasAction && <Skeleton className="col-start-2 row-span-2 row-start-1 h-5 w-16 justify-self-end rounded-md" />}
  </CardHeader>
)

export const SettingsTabsPending = (): JSX.Element => (
  <div className="border-b border-border">
    <div className="no-scrollbar flex h-8 w-full items-center justify-start gap-6 overflow-x-auto p-[3px]">
      {SETTINGS_TABS.map((tab) => (
        <Skeleton className="h-lh w-18 shrink-0 scale-y-70 text-sm" key={tab} />
      ))}
    </div>
  </div>
)

export const EmailCardPending = (): JSX.Element => (
  <Card>
    <CardHeaderPending hasAction />
    <CardContent className="pb-(--card-spacing)">
      <Skeleton className="h-lh w-56 max-w-full scale-y-70 text-sm" />
    </CardContent>
    <CardFooter className="justify-end">
      <Skeleton className="h-7 w-28 rounded-md" />
    </CardFooter>
  </Card>
)

export const DeleteAccountCardPending = (): JSX.Element => (
  <Card>
    <CardHeaderPending />
    <CardContent className="flex flex-col gap-2 pb-(--card-spacing) text-sm">
      <Skeleton className="h-lh w-full scale-y-70" />
      <Skeleton className="h-lh w-2/3 scale-y-70" />
    </CardContent>
    <CardFooter className="justify-end">
      <Skeleton className="h-7 w-32 rounded-md" />
    </CardFooter>
  </Card>
)
