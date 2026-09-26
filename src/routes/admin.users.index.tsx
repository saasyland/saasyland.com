import { createFileRoute, redirect } from "@tanstack/react-router"

import { ROUTES } from "~/src/routes"
export const Route = createFileRoute("/admin/users/")({
  beforeLoad: () => {
    throw redirect({ to: ROUTES.ADMIN_USERS_ALL })
  },
})
