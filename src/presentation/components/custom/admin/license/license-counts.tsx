import type { JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { useTranslations } from "use-intl/react"

import { LICENSE_STATUSES, LICENSE_TIERS } from "~/src/modules/license/license.constants"
import { licenseCountsQuery } from "~/src/modules/license/use-cases/get-license-counts"

import { Card } from "~/src/presentation/components/shadcn/card"
import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "~/src/presentation/components/shadcn/table"

import { licenseCountColumns } from "~/src/presentation/components/custom/admin/license/license-count-columns"
import { PaginationPending } from "~/src/presentation/components/custom/admin/pending-blocks"
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

export const LicenseCountsPending = (): JSX.Element => (
  <Card className="flex flex-col gap-4 p-5">
    <div className="max-w-2xl">
      <Skeleton className="h-lh w-32 scale-y-70 text-title" />
      <div className="mt-0.5 flex flex-col text-body-sm">
        <Skeleton className="h-lh w-120 max-w-full scale-y-70" />
        <Skeleton className="h-lh w-64 max-w-full scale-y-70" />
      </div>
    </div>
    <TableContainer>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Skeleton className="h-lh w-10 scale-y-70" />
            </TableHead>
            {LICENSE_STATUSES.map((status) => (
              <TableHead key={status}>
                <Skeleton className="h-lh w-16 scale-y-70" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {LICENSE_TIERS.map((tier) => (
            <TableRow key={tier}>
              <TableCell>
                <Skeleton className="h-lh w-18 scale-y-70 text-sm" />
              </TableCell>
              {LICENSE_STATUSES.map((status) => (
                <TableCell key={status}>
                  <Skeleton className="h-lh w-6 scale-y-70 text-sm" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
    <PaginationPending />
  </Card>
)
