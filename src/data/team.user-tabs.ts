import type { UserTab } from "~/src/data/user-tabs"

import { AdminUsersInvitationsPending, AdminUsersRolesPending } from "~/src/presentation/components/custom/admin/team-pending"

import { ROUTES } from "~/src/routes"

const AREA = "team"

export const TEAM_USER_TABS = [
  { area: AREA, key: "invitations", order: 20, pendingComponent: AdminUsersInvitationsPending, to: ROUTES.ADMIN_USERS_INVITATIONS },
  { area: AREA, key: "roles", order: 30, pendingComponent: AdminUsersRolesPending, to: ROUTES.ADMIN_USERS_ROLES },
] as const satisfies readonly UserTab[]
