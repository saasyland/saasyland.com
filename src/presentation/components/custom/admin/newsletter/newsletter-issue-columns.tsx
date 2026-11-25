import { type JSX, useMemo } from "react"

import { type CellContext, createColumnHelper } from "@tanstack/react-table"
import { useFormatter, useTranslations } from "use-intl/react"

import { DATA_GRID_ALIGN, DATA_GRID_FILTER, DATA_GRID_PIN, type DataGridFeatures } from "~/src/integrations/tanstack-table/table.features"

import { NEWSLETTER_ISSUE_STATUSES } from "~/src/modules/newsletter-issue/newsletter-issue.constants"
import type { NewsletterIssue } from "~/src/modules/newsletter-issue/newsletter-issue.types"

import { NEWSLETTER_ISSUE_COLUMN_SIZES, NEWSLETTER_ISSUE_STATUS_BADGES } from "~/src/data/newsletter-admin"

import { Badge } from "~/src/presentation/components/shadcn/badge"

import type { DataGridColumn } from "~/src/presentation/components/custom/data-grid"

type IssueRow = NewsletterIssue["listRow"]

export const NEWSLETTER_ISSUE_GRID_ID = "newsletter-issues"

const SubjectCell = ({ getValue }: CellContext<DataGridFeatures, IssueRow, string>): JSX.Element => (
  <span className="block truncate font-medium text-foreground" title={getValue()}>
    {getValue()}
  </span>
)

const StatusCell = ({ getValue }: CellContext<DataGridFeatures, IssueRow, IssueRow["status"]>): JSX.Element => {
  const t = useTranslations("pages.admin.newsletter.issues.status")

  return <Badge variant={NEWSLETTER_ISSUE_STATUS_BADGES[getValue()]}>{t(getValue())}</Badge>
}

const RecipientsCell = ({ row }: CellContext<DataGridFeatures, IssueRow, number>): JSX.Element => {
  const t = useTranslations("pages.admin.newsletter.issues")

  return (
    <span className="text-sm text-foreground tabular-nums">
      {t("recipients", { recipients: row.original.recipientCount, sent: row.original.sentCount })}
    </span>
  )
}

const LocalesCell = ({ getValue }: CellContext<DataGridFeatures, IssueRow, IssueRow["locales"]>): JSX.Element => {
  const t = useTranslations("pages.admin.newsletter.issues")

  return <span className="text-sm text-muted-foreground tabular-nums">{t("locales", { count: getValue().length })}</span>
}

const DateCell = ({ getValue }: CellContext<DataGridFeatures, IssueRow, Date | null>): JSX.Element => {
  const t = useTranslations()
  const format = useFormatter()

  const value = getValue()

  if (value === null) {
    return <span className="text-sm text-muted-foreground">{t("pages.admin.newsletter.issues.notSent")}</span>
  }

  return (
    <time className="text-sm text-muted-foreground" dateTime={value.toISOString()} title={t("auth.dates.dateTime", { value })}>
      {format.dateTime(value, "date")}
    </time>
  )
}

const columnHelper = createColumnHelper<DataGridFeatures, IssueRow>()

export const useNewsletterIssueColumns = (): DataGridColumn<IssueRow>[] => {
  const t = useTranslations("pages.admin.newsletter.issues")

  return useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor("subject", {
          cell: SubjectCell,
          enableSorting: false,
          header: t("table.subject"),
          meta: { pinned: DATA_GRID_PIN.START },
          size: NEWSLETTER_ISSUE_COLUMN_SIZES.subject,
        }),
        columnHelper.accessor("status", {
          cell: StatusCell,
          header: t("table.status"),
          meta: {
            export: ({ status }) => t(`status.${status}`),
            filter: {
              kind: DATA_GRID_FILTER.MULTI_SELECT,
              options: NEWSLETTER_ISSUE_STATUSES.map((value) => ({ label: t(`status.${value}`), value })),
            },
          },
          size: NEWSLETTER_ISSUE_COLUMN_SIZES.status,
        }),
        columnHelper.accessor("sentCount", {
          cell: RecipientsCell,
          header: t("table.recipients"),
          meta: { align: DATA_GRID_ALIGN.END },
          size: NEWSLETTER_ISSUE_COLUMN_SIZES.recipients,
        }),
        columnHelper.accessor("locales", {
          cell: LocalesCell,
          enableSorting: false,
          header: t("table.locales"),
          meta: { export: ({ locales }) => locales.join(" ") },
          size: NEWSLETTER_ISSUE_COLUMN_SIZES.locales,
        }),
        columnHelper.accessor("createdAt", {
          cell: DateCell,
          header: t("table.createdAt"),
          meta: { filter: { kind: DATA_GRID_FILTER.DATE_RANGE } },
          size: NEWSLETTER_ISSUE_COLUMN_SIZES.createdAt,
        }),
        columnHelper.accessor("sentAt", {
          cell: DateCell,
          header: t("table.sentAt"),
          size: NEWSLETTER_ISSUE_COLUMN_SIZES.sentAt,
        }),
      ]),
    [t],
  )
}
