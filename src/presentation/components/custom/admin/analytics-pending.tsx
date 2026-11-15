import type { JSX } from "react"

import {
  ADMIN_ANALYTICS_KPIS,
  ADMIN_ANALYTICS_REGION_ROWS,
  ADMIN_ANALYTICS_REVENUE_BARS,
  ADMIN_ANALYTICS_TABS,
  ADMIN_ANALYTICS_UPGRADE_ROWS,
  ADMIN_ANALYTICS_Y_AXIS_VALUES,
} from "~/src/data/admin-analytics"

import { Card, CardContent } from "~/src/presentation/components/shadcn/card"
import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import { LongDescriptionPending, TitlePending } from "~/src/presentation/components/custom/admin/pending-blocks"

const AnalyticsChartPending = (): JSX.Element => (
  <Card className="relative overflow-hidden border-border">
    <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between lg:p-6">
      <div>
        <Skeleton className="h-lh w-36 scale-y-70 text-base" />
        <Skeleton className="mt-1 h-lh w-64 scale-y-70 text-xs" />
      </div>
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <Skeleton className="size-2.5 rounded-sm" />
          <Skeleton className="h-lh w-26 scale-y-70" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="size-2.5 rounded-sm" />
          <Skeleton className="h-lh w-14 scale-y-70" />
        </div>
      </div>
    </div>
    <div className="relative flex h-72 flex-col p-6">
      <div className="absolute inset-y-6 right-6 left-6 flex flex-col justify-between">
        {ADMIN_ANALYTICS_Y_AXIS_VALUES.map((value) => (
          <div className="flex w-full items-center justify-start border-t border-border" key={value}>
            <Skeleton className="-mt-2 h-lh w-10 scale-y-70 text-xs" />
          </div>
        ))}
      </div>
      <div className="z-10 ml-8 flex flex-1 items-end gap-1 pt-4 pb-0.5 sm:gap-2">
        {ADMIN_ANALYTICS_REVENUE_BARS.map((bar) => (
          <div className="flex h-full flex-1 flex-col justify-end" key={bar.id}>
            <Skeleton className="w-full rounded-none rounded-t-xs" style={{ height: bar.height1 }} />
            <Skeleton className="w-full rounded-none rounded-b-xs" style={{ height: bar.height2 }} />
          </div>
        ))}
      </div>
    </div>
  </Card>
)

const AnalyticsListHeaderPending = (): JSX.Element => (
  <div className="flex items-center justify-between border-b border-border p-5">
    <Skeleton className="h-lh w-36 scale-y-70 text-base" />
    <Skeleton className="h-lh w-12 scale-y-70 text-xs" />
  </div>
)

export const AdminAnalyticsPending = (): JSX.Element => (
  <div aria-busy="true" className="flex w-full flex-col space-y-8">
    <div>
      <TitlePending />
      <LongDescriptionPending />
    </div>
    <div className="flex w-full flex-col gap-2">
      <div className="flex flex-col gap-4 border-b border-border sm:flex-row sm:items-center sm:justify-between">
        <div className="no-scrollbar flex h-8 min-h-8 flex-1 items-center justify-start gap-6 overflow-x-auto p-[3px]">
          {ADMIN_ANALYTICS_TABS.map((tab) => (
            <Skeleton className="h-lh w-16 shrink-0 scale-y-70 text-sm" key={tab} />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3 pb-3 sm:pb-0">
          <Skeleton className="h-9 w-38 rounded-lg" />
        </div>
      </div>
      <div className="mt-8 space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {ADMIN_ANALYTICS_KPIS.map(({ metric }) => (
            <Card className="relative overflow-hidden border-border" key={metric}>
              <CardContent className="p-5">
                <div className="mb-4 flex items-start justify-between">
                  <Skeleton className="h-lh w-24 scale-y-70 text-sm" />
                  <Skeleton className="size-8 rounded-lg" />
                </div>
                <Skeleton className="h-lh w-36 scale-y-70 text-3xl" />
                <div className="mt-2 flex items-center gap-2">
                  <Skeleton className="h-5 w-13 rounded-4xl" />
                  <Skeleton className="h-lh w-18 scale-y-70 text-xs" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <AnalyticsChartPending />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="relative overflow-hidden border-border">
            <AnalyticsListHeaderPending />
            <CardContent className="space-y-5 p-5">
              {ADMIN_ANALYTICS_REGION_ROWS.map((region) => (
                <div key={region.code}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <Skeleton className="h-lh w-32 scale-y-70" />
                    <Skeleton className="h-lh w-8 scale-y-70" />
                  </div>
                  <Skeleton className="h-1.5 w-full rounded-full" />
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden border-border">
            <AnalyticsListHeaderPending />
            <div className="divide-y divide-border">
              {ADMIN_ANALYTICS_UPGRADE_ROWS.map((upgrade) => (
                <div className="flex items-center justify-between p-4" key={upgrade.id}>
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-8 shrink-0 rounded-full" />
                    <div>
                      <Skeleton className="h-lh w-28 scale-y-70 text-sm" />
                      <Skeleton className="h-lh w-40 scale-y-70 text-xs" />
                    </div>
                  </div>
                  <Skeleton className="h-lh w-14 scale-y-70 text-xs" />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  </div>
)
