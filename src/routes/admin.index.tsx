import type { JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { getUsersQuery } from "~/src/modules/user/use-cases/get-users"

import { ADMIN_DASHBOARD_PREVIEW_PAGINATION } from "~/src/data/admin"
import { ADMIN_DASHBOARD_PANELS, ADMIN_DASHBOARD_STATS } from "~/src/data/dashboard"

import { pageHead } from "~/src/lib/seo"

import { LinkButton } from "~/src/presentation/components/shadcn/button"

import { AdminPageHeader } from "~/src/presentation/components/custom/admin/admin-page-header"
import { AdminDashboardPending } from "~/src/presentation/components/custom/admin/auth-pending"
import { DashboardActions } from "~/src/presentation/components/custom/admin/dashboard/actions"
import { DashboardStats } from "~/src/presentation/components/custom/admin/dashboard/stats"
import { DASHBOARD_USER_GRID_ID, useDashboardUserColumns } from "~/src/presentation/components/custom/admin/dashboard/user-columns"
import { DataGrid } from "~/src/presentation/components/custom/data-grid"

import { ROUTES } from "~/src/routes"

const DashboardPage = (): JSX.Element => {
  const t = useTranslations("pages.admin.dashboard")
  const columns = useDashboardUserColumns()
  const users = useSuspenseQuery(getUsersQuery).data

  return (
    <div className="flex w-full animate-in flex-col space-y-8 pb-8 duration-500 fade-in-50">
      <AdminPageHeader actions={<DashboardActions />} description={t("metadata.description")} title={t("metadata.title")} />

      <DashboardStats />

      {ADMIN_DASHBOARD_PANELS.map(({ Panel, key }) => (
        <Panel key={key} />
      ))}

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-title text-foreground">{t("users.title")}</h2>
          <p className="mt-0.5 text-body-sm text-muted-foreground">{t("users.description")}</p>
        </div>

        <DataGrid
          columns={columns}
          data={users.rows.slice(0, ADMIN_DASHBOARD_PREVIEW_PAGINATION.pageSize)}
          id={DASHBOARD_USER_GRID_ID}
          label={t("users.title")}
          search={t("users.search")}
          selectable
        />

        <div className="flex justify-end">
          <LinkButton className="h-7 px-2.5" size="sm" to={ROUTES.ADMIN_USERS} variant="outline">
            {t("users.table.pagination.viewAll")}
          </LinkButton>
        </div>
      </section>
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
      ...[...ADMIN_DASHBOARD_STATS, ...ADMIN_DASHBOARD_PANELS].map((entry) => entry.prefetch?.(context.queryClient)),
      ...ADMIN_DASHBOARD_PANELS.map(({ Panel }) => Panel.preload?.()),
    ])
    return { locale, metadata }
  },
  pendingComponent: AdminDashboardPending,
  staticData: { namespaces: [NAMESPACE] },
})
