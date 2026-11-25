import type { JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { getUsersPageQuery, getUsersQuery } from "~/src/modules/user/use-cases/get-users"
import { userZodSchemas } from "~/src/modules/user/user.zod"

import { pageHead } from "~/src/lib/seo"

import { AdminUsersAllPending } from "~/src/presentation/components/custom/admin/auth-pending"
import { CreateUserDialog } from "~/src/presentation/components/custom/admin/users/create-user-dialog"
import { UserRowActions } from "~/src/presentation/components/custom/admin/users/row-actions"
import { USER_GRID_ID, useUserColumns } from "~/src/presentation/components/custom/admin/users/user-columns"
import { DataGrid } from "~/src/presentation/components/custom/data-grid"

import * as ROUTES from "~/src/routes"

const UsersAllPage = (): JSX.Element => {
  const t = useTranslations("pages.admin.users.table")
  const columns = useUserColumns()

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col gap-4">
      <div className="flex justify-end">
        <CreateUserDialog />
      </div>

      <DataGrid
        columns={columns}
        empty={t("empty")}
        id={USER_GRID_ID}
        label={t("label")}
        query={(request) => getUsersPageQuery(userZodSchemas.getUsers.parse(request))}
        rowActions={UserRowActions}
        search={t("search")}
        selectable
      />
    </div>
  )
}

const NAMESPACE = "pages.admin.users"

export const Route = createFileRoute("/admin/users/all")({
  component: UsersAllPage,
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    const [metadata] = await Promise.all([
      loadPageMetadata({ locale, namespace: NAMESPACE }),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
      context.queryClient.query({ ...getUsersQuery, staleTime: "static" }),
    ])
    return { locale, metadata }
  },
  head: pageHead(ROUTES.ADMIN_USERS_ALL),
  pendingComponent: AdminUsersAllPending,
  staticData: { namespaces: [NAMESPACE] },
})
