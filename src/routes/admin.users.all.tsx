import type { JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { getUsersPageQuery, getUsersQuery } from "~/src/modules/user/use-cases/get-users"

import { pageHead } from "~/src/lib/seo"

import { AdminUsersAllPending } from "~/src/presentation/components/custom/admin/auth-pending"
import { CreateUserDialog } from "~/src/presentation/components/custom/admin/users/create-user-dialog"
import { userColumns } from "~/src/presentation/components/custom/admin/users/user-columns"
import { DataTable } from "~/src/presentation/components/custom/data-table"

import { ROUTES } from "~/src/routes"

const UsersAllPage = (): JSX.Element => (
  <div className="flex min-h-0 w-full flex-1 flex-col gap-4">
    <div className="flex justify-end">
      <CreateUserDialog />
    </div>

    <DataTable columns={userColumns} options={{ query: getUsersPageQuery, selectable: true }} />
  </div>
)

const NAMESPACE = "pages.admin.users"

export const Route = createFileRoute("/admin/users/all")({
  component: UsersAllPage,
  head: pageHead(ROUTES.ADMIN_USERS_ALL),
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    const [metadata] = await Promise.all([
      loadPageMetadata({ locale, namespace: NAMESPACE }),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
      context.queryClient.query({ ...getUsersQuery, staleTime: "static" }),
    ])
    return { locale, metadata }
  },
  pendingComponent: AdminUsersAllPending,
  staticData: { namespaces: [NAMESPACE] },
})
