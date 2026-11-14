import type { JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Calendar, Download } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { getUsersQuery } from "~/src/modules/user/use-cases/get-users"
import { USER_STATUSES } from "~/src/modules/user/user.utils"

import { ADMIN_DASHBOARD_PREVIEW_PAGINATION } from "~/src/data/admin"
import { ADMIN_DASHBOARD_STATS } from "~/src/data/dashboard"
import { ADMIN_DASHBOARD_ACTIONS } from "~/src/data/navigation"

import { pageHead } from "~/src/lib/seo"

import { Button, LinkButton } from "~/src/presentation/components/shadcn/button"
import { Card } from "~/src/presentation/components/shadcn/card"

import { RevenueChart } from "~/src/presentation/components/custom/admin/dashboard/revenue-chart"
import { DashboardStats } from "~/src/presentation/components/custom/admin/dashboard/stats"
import { dashboardUserColumns } from "~/src/presentation/components/custom/admin/dashboard/user-columns"
import { AdminDashboardPending } from "~/src/presentation/components/custom/admin/overview-pending"
import { DataTable } from "~/src/presentation/components/custom/data-table"

import { ROUTES } from "~/src/routes"

const DashboardPage = (): JSX.Element => {
  const t = useTranslations("pages.admin.dashboard")
  const users = useSuspenseQuery(getUsersQuery).data

  return (
    <div className="flex w-full animate-in flex-col space-y-8 pb-8 duration-500 fade-in-50">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-statement font-semibold text-foreground">{t("metadata.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("metadata.description")}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="h-9 gap-2" isDisabled>
            <Calendar className="size-4 text-muted-foreground" />
            {t("actions.last30Days")}
          </Button>
          {ADMIN_DASHBOARD_ACTIONS.map((action) => (
            <LinkButton className="h-9 gap-2 shadow-sm" href={action.to} key={action.key}>
              <action.icon aria-hidden className="size-4" />
              {t(`actions.${action.key}`)}
            </LinkButton>
          ))}
        </div>
      </div>

      <DashboardStats />

      <RevenueChart />

      <Card className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-title text-foreground">{t("users.title")}</h2>
            <p className="mt-0.5 text-body-sm text-muted-foreground">{t("users.description")}</p>
          </div>
          <Button className="h-8 gap-1.5 px-2.5 text-xs" size="sm" variant="outline">
            <Download className="size-3.5 text-muted-foreground" strokeWidth={1.75} />
            {t("users.export")}
          </Button>
        </div>

        <DataTable
          columns={dashboardUserColumns}
          data={users.rows}
          filters={[
            { columnId: "user", placeholder: t("users.search"), type: "search" },
            {
              columnId: "status",
              label: t("users.filters.status"),
              options: USER_STATUSES.map((status) => ({ label: t(`users.table.status.${status}`), value: status })),
              type: "select",
            },
          ]}
          options={{ initialState: { pagination: ADMIN_DASHBOARD_PREVIEW_PAGINATION }, selectable: true }}
        />

        <div className="flex justify-end">
          {users.total > ADMIN_DASHBOARD_PREVIEW_PAGINATION.pageSize && (
            <LinkButton className="h-7 px-2.5" href={ROUTES.ADMIN_USERS} size="sm" variant="outline">
              {t("users.table.pagination.viewAll")}
            </LinkButton>
          )}
          {users.total <= ADMIN_DASHBOARD_PREVIEW_PAGINATION.pageSize && (
            <Button className="h-7 px-2.5" isDisabled size="sm" variant="outline">
              {t("users.table.pagination.viewAll")}
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}

const NAMESPACE = "pages.admin.dashboard"

export const Route = createFileRoute("/admin/")({
  component: DashboardPage,
  head: pageHead(ROUTES.ADMIN),
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    const [metadata] = await Promise.all([
      loadPageMetadata({ locale, namespace: NAMESPACE }),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
      context.queryClient.query({ ...getUsersQuery, staleTime: "static" }),
      ...ADMIN_DASHBOARD_STATS.map((stat) => stat.prefetch(context.queryClient)),
    ])
    return { locale, metadata }
  },
  pendingComponent: AdminDashboardPending,
  staticData: { namespaces: [NAMESPACE] },
})
