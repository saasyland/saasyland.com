import type { JSX } from "react"

import { usePagePending } from "~/src/hooks/use-page-pending"

import { DATA_GRID_ACTIONS_SIZE } from "~/src/data/data-grid"
import { NEWSLETTER_ISSUE_COLUMN_SIZES, NEWSLETTER_SUBSCRIBER_COLUMN_SIZES } from "~/src/data/newsletter-admin"

import { Card, CardContent, CardFooter, CardHeader } from "~/src/presentation/components/shadcn/card"
import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import { AdminPageHeaderPending } from "~/src/presentation/components/custom/admin/admin-page-header"
import { NEWSLETTER_TABS } from "~/src/presentation/components/custom/admin/newsletter/newsletter-tabs"
import { FieldPending } from "~/src/presentation/components/custom/admin/pending-blocks"
import { DataGridPending } from "~/src/presentation/components/custom/data-grid-pending"

const TextPending = (): JSX.Element => <Skeleton className="h-lh w-24 scale-y-70 text-sm" />

const BadgePending = (): JSX.Element => <Skeleton className="h-5.5 w-20 rounded-md" />

const PREVIEW_LINES = ["first", "second", "third"] as const

const SUBSCRIBER_PENDING_COLUMNS = [
  { cell: <Skeleton className="h-lh w-44 scale-y-70 text-sm" />, id: "email", width: NEWSLETTER_SUBSCRIBER_COLUMN_SIZES.email },
  { cell: <BadgePending />, id: "status", width: NEWSLETTER_SUBSCRIBER_COLUMN_SIZES.status },
  { cell: <TextPending />, id: "createdAt", width: NEWSLETTER_SUBSCRIBER_COLUMN_SIZES.createdAt },
  { cell: <TextPending />, id: "subscribedAt", width: NEWSLETTER_SUBSCRIBER_COLUMN_SIZES.subscribedAt },
  { cell: <TextPending />, id: "locale", width: NEWSLETTER_SUBSCRIBER_COLUMN_SIZES.locale },
] as const

const ISSUE_PENDING_COLUMNS = [
  { cell: <Skeleton className="h-lh w-56 scale-y-70 text-sm" />, id: "subject", width: NEWSLETTER_ISSUE_COLUMN_SIZES.subject },
  { cell: <BadgePending />, id: "status", width: NEWSLETTER_ISSUE_COLUMN_SIZES.status },
  { cell: <TextPending />, id: "sentCount", width: NEWSLETTER_ISSUE_COLUMN_SIZES.recipients },
  { cell: <TextPending />, id: "locales", width: NEWSLETTER_ISSUE_COLUMN_SIZES.locales },
  { cell: <TextPending />, id: "createdAt", width: NEWSLETTER_ISSUE_COLUMN_SIZES.createdAt },
  { cell: <TextPending />, id: "sentAt", width: NEWSLETTER_ISSUE_COLUMN_SIZES.sentAt },
] as const

export const AdminNewsletterPending = (): JSX.Element => {
  const Page = usePagePending("/admin/newsletter")

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <AdminPageHeaderPending actions={1} tabs={NEWSLETTER_TABS.length} />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden pt-8">{Page && <Page />}</div>
    </div>
  )
}

export const AdminNewsletterSubscribersPending = (): JSX.Element => (
  <div aria-busy="true" className="flex min-h-0 w-full flex-1 flex-col">
    <DataGridPending columns={SUBSCRIBER_PENDING_COLUMNS} isSelectable />
  </div>
)

export const AdminNewsletterIssuesPending = (): JSX.Element => (
  <div aria-busy="true" className="flex min-h-0 w-full flex-1 flex-col">
    <DataGridPending actionsWidth={DATA_GRID_ACTIONS_SIZE} columns={ISSUE_PENDING_COLUMNS} />
  </div>
)

export const AdminNewsletterComposePending = (): JSX.Element => (
  <div aria-busy="true" className="flex w-full flex-col space-y-8">
    <AdminPageHeaderPending hasBack />
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <Skeleton className="h-lh w-32 scale-y-70 text-base" />
          <Skeleton className="h-lh w-64 max-w-full scale-y-70 text-sm" />
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <Skeleton className="h-12 w-full rounded-lg" />
          <FieldPending />
          <div className="flex w-full flex-col gap-2">
            <Skeleton className="h-lh w-28 scale-y-70 text-sm leading-snug" />
            <Skeleton className="h-80 w-full rounded-md" />
          </div>
        </CardContent>
        <CardFooter className="justify-between">
          <Skeleton className="h-lh w-48 scale-y-70 text-body-sm" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </CardFooter>
      </Card>
      <Card>
        <CardHeader className="border-b">
          <Skeleton className="h-lh w-24 scale-y-70 text-base" />
          <Skeleton className="h-lh w-56 max-w-full scale-y-70 text-sm" />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Skeleton className="h-lh w-64 max-w-full scale-y-70 text-title" />
          {PREVIEW_LINES.map((line) => (
            <Skeleton className="h-lh w-full scale-y-70 text-body-sm" key={line} />
          ))}
        </CardContent>
      </Card>
    </div>
  </div>
)
