import type { JSX } from "react"

import { type CellContext, createColumnHelper } from "@tanstack/react-table"
import { useFormatter, useTranslations } from "use-intl/react"

import { LICENSE_STATUSES, type LicenseStatus, type LicenseTier } from "~/src/modules/license/license.constants"
import type { License } from "~/src/modules/license/license.types"

import type { DataTableFeatures } from "~/src/presentation/components/custom/data-table"

type LicenseCount = License["licenseCount"]

type LicenseCountColumnId = "tier" | LicenseStatus

const ColumnHeader = ({ id }: { readonly id: LicenseCountColumnId }): string => {
  const t = useTranslations("dashboard.license.licenses.columns")

  return t(id)
}

const TierCell = ({ getValue }: CellContext<DataTableFeatures, LicenseCount, LicenseTier>): JSX.Element => {
  const t = useTranslations("components.custom.pricing.tiers")

  return <span className="text-sm font-medium text-foreground">{t(`${getValue()}.name`)}</span>
}

const CountCell = ({ getValue }: CellContext<DataTableFeatures, LicenseCount, number>): JSX.Element => {
  const format = useFormatter()

  return <span className="text-sm text-foreground tabular-nums">{format.number(getValue())}</span>
}

const columnHelper = createColumnHelper<DataTableFeatures, LicenseCount>()

export const licenseCountColumns = columnHelper.columns([
  columnHelper.accessor("tier", { cell: TierCell, enableSorting: false, header: () => <ColumnHeader id="tier" /> }),
  ...LICENSE_STATUSES.map((status) =>
    columnHelper.accessor(status, { cell: CountCell, enableSorting: false, header: () => <ColumnHeader id={status} /> }),
  ),
])
