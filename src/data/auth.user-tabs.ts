import type { UserTab } from "~/src/data/user-tabs"

import { AdminUsersAllPending, AdminUsersInvitationsPending } from "~/src/presentation/components/custom/admin/auth-pending"

import { ROUTES } from "~/src/routes"

const AREA = "auth"

export const AUTH_USER_TABS = [
  { area: AREA, key: "allUsers", order: 10, pendingComponent: AdminUsersAllPending, to: ROUTES.ADMIN_USERS_ALL },
  {
    area: AREA,
    key: "invitations",
    order: 30,
    pendingComponent: AdminUsersInvitationsPending,
    to: ROUTES.ADMIN_USERS_INVITATIONS,
  },
] as const satisfies readonly UserTab[]
