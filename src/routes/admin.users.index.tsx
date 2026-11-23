import { createFileRoute, redirect } from "@tanstack/react-router"

import { AdminUsersAllPending } from "~/src/presentation/components/custom/admin/auth-pending"

import * as ROUTES from "~/src/routes"

export const Route = createFileRoute("/admin/users/")({
  beforeLoad: () => {
    throw redirect({ to: ROUTES.ADMIN_USERS_ALL })
  },
  pendingComponent: AdminUsersAllPending,
})
