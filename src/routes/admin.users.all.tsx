import type { JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"

import { loadRouteMessages, routeHead } from "~/src/integrations/use-intl/i18n.metadata"

import { getUsersPageQuery, getUsersQuery } from "~/src/modules/user/use-cases/get-users"

import { AddUserButton } from "~/src/presentation/components/custom/admin/users/all/components/actions"
import { useAllUsersColumns } from "~/src/presentation/components/custom/admin/users/all/components/columns"
import { DataTable } from "~/src/presentation/components/custom/data-table/data-table"

const AllUsersPage = (): JSX.Element => {
  const columns = useAllUsersColumns()

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col gap-4">
      <div className="flex justify-end">
        <AddUserButton />
      </div>

      <DataTable
        columns={columns}
        query={getUsersPageQuery}
        options={{ initialState: { columnPinning: { end: ["actions"], start: ["select"] } } }}
      />
    </div>
  )
}

export const Route = createFileRoute("/admin/users/all")({
  component: AllUsersPage,
  head: routeHead,
  loader: async ({ context }) => {
    const [metadata] = await Promise.all([
      loadRouteMessages({
        metadataNamespace: "pages.admin.users",
        namespaces: ["auth.errors", "auth.validations", "pages.admin", "pages.admin.sidebar", "pages.admin.users", "user.validations"],
        pathname: "/admin/users/all",
        queryClient: context.queryClient,
      }),
      context.queryClient.query({ ...getUsersQuery, staleTime: "static" }),
    ])
    return metadata
  },
  staticData: {
    namespaces: ["auth.errors", "auth.validations", "pages.admin", "pages.admin.sidebar", "pages.admin.users", "user.validations"],
  },
})
