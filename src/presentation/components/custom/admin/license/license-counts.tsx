import type { JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { useTranslations } from "use-intl/react"

import { licenseCountsQuery } from "~/src/modules/license/use-cases/get-license-counts"

import { LICENSE_COUNT_GRID_ID, useLicenseCountColumns } from "~/src/presentation/components/custom/admin/license/license-count-columns"
import { DataGrid } from "~/src/presentation/components/custom/data-grid"

export const LicenseCounts = (): JSX.Element => {
  const t = useTranslations("dashboard.license.licenses")

  const columns = useLicenseCountColumns()

  const { rows } = useSuspenseQuery(licenseCountsQuery).data

  return (
    <section className="flex flex-col gap-4">
      <div className="max-w-2xl">
        <h2 className="text-title text-foreground">{t("title")}</h2>
        <p className="mt-0.5 text-body-sm text-muted-foreground">{t("description")}</p>
      </div>

      <DataGrid columns={columns} data={rows} id={LICENSE_COUNT_GRID_ID} label={t("title")} />
    </section>
  )
}
