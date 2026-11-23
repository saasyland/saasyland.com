import { type JSX, useMemo } from "react"

import { type CellContext, createColumnHelper } from "@tanstack/react-table"
import { useFormatter, useTranslations } from "use-intl/react"

import { DATA_GRID_ALIGN, DATA_GRID_FILTER, DATA_GRID_PIN, type DataGridFeatures } from "~/src/integrations/tanstack-table/table.features"

import { LICENSE_STATUSES, type LicenseTier } from "~/src/modules/license/license.constants"
import type { License } from "~/src/modules/license/license.types"

import { DASHBOARD_COLUMN_SIZES } from "~/src/data/admin"

import type { DataGridColumn } from "~/src/presentation/components/custom/data-grid"

type LicenseCount = License["licenseCount"]

export const LICENSE_COUNT_GRID_ID = "license-counts"

const TierCell = ({ getValue }: CellContext<DataGridFeatures, LicenseCount, LicenseTier>): JSX.Element => {
  const t = useTranslations("components.custom.pricing.tiers")

  return <span className="text-sm font-medium text-foreground">{t(`${getValue()}.name`)}</span>
}

const CountCell = ({ getValue }: CellContext<DataGridFeatures, LicenseCount, number>): JSX.Element => {
  const format = useFormatter()

  return <span className="text-sm text-foreground">{format.number(getValue())}</span>
}

const columnHelper = createColumnHelper<DataGridFeatures, LicenseCount>()

export const useLicenseCountColumns = (): DataGridColumn<LicenseCount>[] => {
  const t = useTranslations()

  return useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor("tier", {
          cell: TierCell,
          header: t("dashboard.license.licenses.columns.tier"),
          meta: { export: ({ tier }) => t(`components.custom.pricing.tiers.${tier}.name`), pinned: DATA_GRID_PIN.START },
          size: DASHBOARD_COLUMN_SIZES.name,
        }),
        ...LICENSE_STATUSES.map((status) =>
          columnHelper.accessor(status, {
            cell: CountCell,
            header: t(`dashboard.license.licenses.columns.${status}`),
            meta: { align: DATA_GRID_ALIGN.END, filter: { kind: DATA_GRID_FILTER.NUMBER_RANGE } },
            size: DASHBOARD_COLUMN_SIZES.count,
          }),
        ),
      ]),
    [t],
  )
}
