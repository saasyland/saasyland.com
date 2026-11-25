import { type JSX, useCallback, useMemo } from "react"

import { type CellContext, createColumnHelper } from "@tanstack/react-table"
import { ExternalLink } from "lucide-react"
import { Link } from "react-aria-components"
import { useFormatter, useTranslations } from "use-intl/react"

import { POLAR_PRICE_TYPE, POLAR_PRODUCT_STATUSES } from "~/src/integrations/polar/polar.constants"
import { DATA_GRID_ALIGN, DATA_GRID_FILTER, DATA_GRID_PIN, type DataGridFeatures } from "~/src/integrations/tanstack-table/table.features"

import { CURRENCIES } from "~/src/modules/_core/constants/currency"
import type { Order } from "~/src/modules/order/order.types"

import { POLAR_PRODUCT_COLUMN_SIZES, POLAR_PRODUCT_STATUS_BADGES } from "~/src/data/admin-products"

import type { PolarCataloguePrice, PolarCatalogueProduct } from "~/src/lib/polar-catalogue"

import { Badge } from "~/src/presentation/components/shadcn/badge"

import type { DataGridColumn } from "~/src/presentation/components/custom/data-grid"

export type PolarProductRow = PolarCatalogueProduct & Pick<Order["productSales"], "revenue" | "sales">

type MoneyText = (money: Order["money"]) => string

type Recurrence = PolarCatalogueProduct["recurrence"]

export const POLAR_PRODUCT_GRID_ID = "polar-products"

const LIST_SEPARATOR = "; "

const exportedMoney: MoneyText = ({ amount, currency }) => `${amount.toFixed(CURRENCIES[currency].exponent)} ${currency}`

const useLocalMoney = (): MoneyText => {
  const format = useFormatter()

  return useCallback(({ amount, currency }) => format.number(amount, { currency, style: "currency" }), [format])
}

const usePriceText = (money: MoneyText): ((price: PolarCataloguePrice, recurrence: Recurrence) => string) => {
  const t = useTranslations("pages.admin.products.table")

  return useCallback(
    (price, recurrence) => {
      const amount = (): string => {
        if (price.amountType === POLAR_PRICE_TYPE.FIXED) {
          return money(price.money)
        }

        if (price.amountType === POLAR_PRICE_TYPE.CUSTOM) {
          return t("prices.custom", { amount: money(price.money) })
        }

        return t(`prices.${price.amountType}`, { currency: price.currency })
      }

      if (recurrence === undefined) {
        return amount()
      }

      return t(`recurrence.${recurrence.interval}`, { count: recurrence.count, price: amount() })
    },
    [money, t],
  )
}

const useLicenseKeyText = (): ((licenseKey: PolarProductRow["licenseKeys"][number]) => string) => {
  const t = useTranslations("pages.admin.products.table")

  return useCallback(({ activations }) => (activations === undefined ? t("unlimitedMachines") : t("machines", { count: activations })), [t])
}

const Muted = ({ text }: { readonly text: string }): JSX.Element => <span className="text-sm text-muted-foreground">{text}</span>

const NameCell = ({ row }: CellContext<DataGridFeatures, PolarProductRow, string>): JSX.Element => (
  <div className="flex min-w-0 flex-col">
    <span className="truncate text-sm font-medium text-foreground">{row.original.name}</span>
    {row.original.description !== undefined && <span className="truncate text-spec text-muted-foreground">{row.original.description}</span>}
  </div>
)

const PricesCell = ({ row }: CellContext<DataGridFeatures, PolarProductRow, PolarProductRow["prices"]>): JSX.Element => {
  const t = useTranslations("pages.admin.products.table")
  const money = useLocalMoney()
  const priceText = usePriceText(money)
  const { prices, recurrence } = row.original

  if (prices.length === 0) {
    return <Muted text={t("prices.none")} />
  }

  return (
    <ul className="flex min-w-0 flex-col text-sm font-medium text-foreground tabular-nums">
      {prices.map((price) => (
        <li className="truncate" key={price.id}>
          {priceText(price, recurrence)}
        </li>
      ))}
    </ul>
  )
}

const LicenseKeysCell = ({ getValue }: CellContext<DataGridFeatures, PolarProductRow, PolarProductRow["licenseKeys"]>): JSX.Element => {
  const t = useTranslations("pages.admin.products.table")
  const licenseKeyText = useLicenseKeyText()
  const licenseKeys = getValue()

  if (licenseKeys.length === 0) {
    return <Muted text={t("noLicenseKey")} />
  }

  return (
    <ul className="flex min-w-0 flex-col text-sm text-foreground">
      {licenseKeys.map((licenseKey) => (
        <li className="truncate" key={licenseKey.id}>
          {licenseKeyText(licenseKey)}
        </li>
      ))}
    </ul>
  )
}

const StatusCell = ({ getValue }: CellContext<DataGridFeatures, PolarProductRow, PolarProductRow["status"]>): JSX.Element => {
  const t = useTranslations("pages.admin.products.table.statusLabels")
  const status = getValue()

  return <Badge variant={POLAR_PRODUCT_STATUS_BADGES[status]}>{t(status)}</Badge>
}

const SalesCell = ({ getValue }: CellContext<DataGridFeatures, PolarProductRow, number>): JSX.Element => {
  const format = useFormatter()

  return <span className="text-sm text-foreground tabular-nums">{format.number(getValue())}</span>
}

const RevenueCell = ({ getValue }: CellContext<DataGridFeatures, PolarProductRow, PolarProductRow["revenue"]>): JSX.Element => {
  const t = useTranslations("pages.admin.products.table")
  const money = useLocalMoney()
  const revenue = getValue()

  if (revenue.length === 0) {
    return <Muted text={t("noRevenue")} />
  }

  return (
    <ul className="flex flex-col items-end text-sm font-medium text-foreground tabular-nums">
      {revenue.map((amount) => (
        <li key={amount.currency}>{money(amount)}</li>
      ))}
    </ul>
  )
}

const PolarCell = ({ row }: CellContext<DataGridFeatures, PolarProductRow, string>): JSX.Element => {
  const t = useTranslations("pages.admin.products.table")

  return (
    <Link
      aria-label={t("openInPolar", { product: row.original.name })}
      className="inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-sm font-mono text-spec text-foreground underline-offset-4 outline-none hover:underline data-focus-visible:outline-2 data-focus-visible:outline-offset-2 data-focus-visible:outline-ring data-focus-visible:outline-solid"
      href={row.original.polarUrl}
      rel="noreferrer"
      target="_blank"
    >
      <span className="truncate">{row.original.id}</span>
      <ExternalLink aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
    </Link>
  )
}

const columnHelper = createColumnHelper<DataGridFeatures, PolarProductRow>()

export const usePolarProductColumns = (): DataGridColumn<PolarProductRow>[] => {
  const t = useTranslations("pages.admin.products.table")
  const priceText = usePriceText(exportedMoney)
  const licenseKeyText = useLicenseKeyText()

  return useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor("name", {
          cell: NameCell,
          header: t("headers.product"),
          id: "product",
          meta: { filter: { kind: DATA_GRID_FILTER.TEXT }, pinned: DATA_GRID_PIN.START },
          size: POLAR_PRODUCT_COLUMN_SIZES.product,
          sortFn: "text",
        }),
        columnHelper.accessor("prices", {
          cell: PricesCell,
          enableSorting: false,
          header: t("headers.prices"),
          meta: {
            export: ({ prices, recurrence }) => prices.map((price) => priceText(price, recurrence)).join(LIST_SEPARATOR),
          },
          size: POLAR_PRODUCT_COLUMN_SIZES.prices,
        }),
        columnHelper.accessor("licenseKeys", {
          cell: LicenseKeysCell,
          enableSorting: false,
          header: t("headers.licenseKeys"),
          meta: {
            export: ({ licenseKeys }) => licenseKeys.map((licenseKey) => licenseKeyText(licenseKey)).join(LIST_SEPARATOR),
          },
          size: POLAR_PRODUCT_COLUMN_SIZES.licenseKeys,
        }),
        columnHelper.accessor("status", {
          cell: StatusCell,
          header: t("headers.status"),
          meta: {
            export: ({ status }) => t(`statusLabels.${status}`),
            filter: {
              kind: DATA_GRID_FILTER.MULTI_SELECT,
              options: POLAR_PRODUCT_STATUSES.map((value) => ({ label: t(`statusLabels.${value}`), value })),
            },
          },
          size: POLAR_PRODUCT_COLUMN_SIZES.status,
          sortFn: "text",
        }),
        columnHelper.accessor("sales", {
          cell: SalesCell,
          header: t("headers.sales"),
          meta: { align: DATA_GRID_ALIGN.END, filter: { kind: DATA_GRID_FILTER.NUMBER_RANGE } },
          size: POLAR_PRODUCT_COLUMN_SIZES.sales,
          sortFn: "basic",
        }),
        columnHelper.accessor("revenue", {
          cell: RevenueCell,
          enableSorting: false,
          header: t("headers.revenue"),
          meta: {
            align: DATA_GRID_ALIGN.END,
            export: ({ revenue }) => revenue.map((amount) => exportedMoney(amount)).join(LIST_SEPARATOR),
          },
          size: POLAR_PRODUCT_COLUMN_SIZES.revenue,
        }),
        columnHelper.accessor("id", {
          cell: PolarCell,
          enableSorting: false,
          header: t("headers.polar"),
          id: "polar",
          meta: { export: ({ polarUrl }) => polarUrl },
          size: POLAR_PRODUCT_COLUMN_SIZES.polar,
        }),
      ]),
    [licenseKeyText, priceText, t],
  )
}
