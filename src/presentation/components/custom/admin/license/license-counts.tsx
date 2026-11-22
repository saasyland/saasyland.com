import type { JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { useTranslations } from "use-intl/react"

import { licenseCountsQuery } from "~/src/modules/license/use-cases/get-license-counts"

import { Card } from "~/src/presentation/components/shadcn/card"

import { licenseCountColumns } from "~/src/presentation/components/custom/admin/license/license-count-columns"
import { DataTable } from "~/src/presentation/components/custom/data-table"

export const LicenseCounts = (): JSX.Element => {
  const t = useTranslations("dashboard.license.licenses")

  const { rows } = useSuspenseQuery(licenseCountsQuery).data

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="max-w-2xl">
        <h2 className="text-title text-foreground">{t("title")}</h2>
        <p className="mt-0.5 text-body-sm text-muted-foreground">{t("description")}</p>
      </div>

      <DataTable columns={licenseCountColumns} data={rows} />
    </Card>
  )
}
