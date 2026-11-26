import type { JSX } from "react"

import { useQueryClient } from "@tanstack/react-query"
import { useRouterState } from "@tanstack/react-router"

import { checkoutSearchSchema } from "~/src/modules/order/order.zod"
import { currentOrdersQuery } from "~/src/modules/order/use-cases/get-current-orders"
import { currentSubscriptionsQuery } from "~/src/modules/subscription/use-cases/get-current-subscriptions"

import { Card, CardContent, CardHeader } from "~/src/presentation/components/shadcn/card"
import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import { PageHeaderPending } from "~/src/presentation/components/custom/app/pending-blocks"

const usePendingBilling = () => {
  const queryClient = useQueryClient()
  const { checkoutId } = useRouterState({ select: ({ location }) => checkoutSearchSchema.parse(location.search) })

  const orders = queryClient.getQueryData(currentOrdersQuery.queryKey)?.orders ?? []
  const subscriptions = queryClient.getQueryData(currentSubscriptionsQuery.queryKey)?.subscriptions ?? []

  return {
    hasHistory: orders.length + subscriptions.length > 0,
    isConfirming: checkoutId !== undefined,
    orders: orders.map(({ id }) => id),
    subscriptions: subscriptions.map(({ id }) => id),
  }
}

export const ConfirmationPending = (): JSX.Element => (
  <div className="flex items-start gap-5 rounded-lg border border-border bg-card p-6 md:p-8">
    <Skeleton className="size-11 shrink-0 rounded-full" />
    <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
      <Skeleton className="h-lh w-56 max-w-full scale-y-70 text-title" />
      <Skeleton className="h-lh w-full max-w-[60ch] scale-y-70 text-body-sm" />
    </div>
  </div>
)

const RowPending = ({ hasAction }: Readonly<{ hasAction: boolean }>): JSX.Element => (
  <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-3 first:pt-0 last:pb-0">
    <div className="flex min-w-0 flex-col gap-0.5">
      <Skeleton className="h-lh w-40 scale-y-70 text-sm" />
      <Skeleton className="h-lh w-24 scale-y-70 text-spec" />
    </div>
    <div className="flex items-center gap-4">
      <div className="flex flex-col items-end gap-1">
        <Skeleton className="h-lh w-16 scale-y-70 text-sm" />
        <Skeleton className="h-5.5 w-14 rounded-md" />
      </div>
      {hasAction && <Skeleton className="h-7 w-20 rounded-md" />}
    </div>
  </div>
)

const CardPending = ({ hasAction, rows }: Readonly<{ hasAction: boolean; rows: readonly string[] }>): JSX.Element => (
  <Card>
    <CardHeader>
      <Skeleton className="h-lh w-28 scale-y-70 text-base leading-snug" />
      <Skeleton className="h-lh w-72 max-w-full scale-y-70 text-sm" />
    </CardHeader>
    <CardContent className="flex flex-col gap-4">
      {rows.length === 0 && <Skeleton className="h-lh w-56 scale-y-70 text-sm" />}
      <div className="flex flex-col divide-y divide-border empty:hidden">
        {rows.map((row) => (
          <RowPending hasAction={hasAction} key={row} />
        ))}
      </div>
    </CardContent>
  </Card>
)

export const BillingHistoryPending = (): JSX.Element => {
  const view = usePendingBilling()

  return (
    <>
      {view.subscriptions.length > 0 && <CardPending hasAction={false} rows={view.subscriptions} />}
      <CardPending hasAction rows={view.orders} />
    </>
  )
}

export const AppBillingPending = (): JSX.Element => {
  const view = usePendingBilling()

  return (
    <div aria-busy="true" className="flex w-full flex-col gap-8 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeaderPending />
        {view.hasHistory && <Skeleton className="h-7 w-32 rounded-md" />}
      </div>
      {view.isConfirming && <ConfirmationPending />}
      <BillingHistoryPending />
    </div>
  )
}
