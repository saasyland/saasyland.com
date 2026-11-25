import { type JSX, useMemo } from "react"

import { type CellContext, createColumnHelper } from "@tanstack/react-table"
import { useFormatter, useTranslations } from "use-intl/react"

import { DATA_GRID_FILTER, DATA_GRID_PIN, type DataGridFeatures } from "~/src/integrations/tanstack-table/table.features"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { NEWSLETTER_SOURCES, NEWSLETTER_STATUSES } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.constants"
import type { NewsletterSubscriber } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.types"

import { NEWSLETTER_SUBSCRIBER_COLUMN_SIZES, NEWSLETTER_SUBSCRIBER_STATUS_BADGES } from "~/src/data/newsletter-admin"

import { Badge } from "~/src/presentation/components/shadcn/badge"

import type { DataGridColumn } from "~/src/presentation/components/custom/data-grid"

type SubscriberRow = NewsletterSubscriber["listRow"]

export const NEWSLETTER_SUBSCRIBER_GRID_ID = "newsletter-subscribers"

const EmailCell = ({ getValue }: CellContext<DataGridFeatures, SubscriberRow, string>): JSX.Element => (
  <span className="block truncate font-medium text-foreground" title={getValue()}>
    {getValue()}
  </span>
)

const StatusCell = ({ getValue }: CellContext<DataGridFeatures, SubscriberRow, SubscriberRow["status"]>): JSX.Element => {
  const t = useTranslations("pages.admin.newsletter.subscribers.status")

  return <Badge variant={NEWSLETTER_SUBSCRIBER_STATUS_BADGES[getValue()]}>{t(getValue())}</Badge>
}

const DateCell = ({ getValue }: CellContext<DataGridFeatures, SubscriberRow, Date | null>): JSX.Element => {
  const t = useTranslations()
  const format = useFormatter()

  const value = getValue()

  if (value === null) {
    return <span className="text-sm text-muted-foreground">{t("pages.admin.newsletter.subscribers.notConfirmed")}</span>
  }

  return (
    <time className="text-sm text-muted-foreground" dateTime={value.toISOString()} title={t("auth.dates.dateTime", { value })}>
      {format.dateTime(value, "date")}
    </time>
  )
}

const LocaleCell = ({ getValue }: CellContext<DataGridFeatures, SubscriberRow, SubscriberRow["locale"]>): JSX.Element => {
  const t = useTranslations("locales")

  return <span className="text-sm text-muted-foreground">{t(getValue())}</span>
}

const SourceCell = ({ getValue }: CellContext<DataGridFeatures, SubscriberRow, SubscriberRow["source"]>): JSX.Element => {
  const t = useTranslations("pages.admin.newsletter.subscribers.source")

  return <span className="text-sm text-muted-foreground">{t(getValue())}</span>
}

const columnHelper = createColumnHelper<DataGridFeatures, SubscriberRow>()

export const useNewsletterSubscriberColumns = (): DataGridColumn<SubscriberRow>[] => {
  const t = useTranslations()

  return useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor("email", {
          cell: EmailCell,
          header: t("pages.admin.newsletter.subscribers.table.email"),
          meta: { pinned: DATA_GRID_PIN.START },
          size: NEWSLETTER_SUBSCRIBER_COLUMN_SIZES.email,
        }),
        columnHelper.accessor("status", {
          cell: StatusCell,
          header: t("pages.admin.newsletter.subscribers.table.status"),
          meta: {
            export: ({ status }) => t(`pages.admin.newsletter.subscribers.status.${status}`),
            filter: {
              kind: DATA_GRID_FILTER.MULTI_SELECT,
              options: NEWSLETTER_STATUSES.map((value) => ({ label: t(`pages.admin.newsletter.subscribers.status.${value}`), value })),
            },
          },
          size: NEWSLETTER_SUBSCRIBER_COLUMN_SIZES.status,
        }),
        columnHelper.accessor("createdAt", {
          cell: DateCell,
          header: t("pages.admin.newsletter.subscribers.table.createdAt"),
          meta: { filter: { kind: DATA_GRID_FILTER.DATE_RANGE } },
          size: NEWSLETTER_SUBSCRIBER_COLUMN_SIZES.createdAt,
        }),
        columnHelper.accessor("subscribedAt", {
          cell: DateCell,
          header: t("pages.admin.newsletter.subscribers.table.subscribedAt"),
          meta: { filter: { kind: DATA_GRID_FILTER.DATE_RANGE } },
          size: NEWSLETTER_SUBSCRIBER_COLUMN_SIZES.subscribedAt,
        }),
        columnHelper.accessor("locale", {
          cell: LocaleCell,
          header: t("pages.admin.newsletter.subscribers.table.locale"),
          meta: {
            filter: {
              kind: DATA_GRID_FILTER.MULTI_SELECT,
              options: I18N.SUPPORTED_LOCALES.map((value) => ({ label: t(`locales.${value}`), value })),
            },
          },
          size: NEWSLETTER_SUBSCRIBER_COLUMN_SIZES.locale,
        }),
        columnHelper.accessor("source", {
          cell: SourceCell,
          enableSorting: false,
          header: t("pages.admin.newsletter.subscribers.table.source"),
          meta: {
            export: ({ source }) => t(`pages.admin.newsletter.subscribers.source.${source}`),
            filter: {
              kind: DATA_GRID_FILTER.MULTI_SELECT,
              options: NEWSLETTER_SOURCES.map((value) => ({ label: t(`pages.admin.newsletter.subscribers.source.${value}`), value })),
            },
            hidden: true,
          },
          size: NEWSLETTER_SUBSCRIBER_COLUMN_SIZES.source,
        }),
      ]),
    [t],
  )
}
