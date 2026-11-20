import { FLOW_AREA, FLOW_STATUS, type Flow } from "./flows"

export const TEAM_FLOWS = [
  {
    area: FLOW_AREA.ADMIN_USERS,
    id: "admin-invitations",
    outcome: "The admin invites a teammate by email, and the invitation can be accepted, resent or revoked",
    reason: "There is no invitation table and no invitations screen.",
    status: FLOW_STATUS.TO_BUILD,
  },
  {
    area: FLOW_AREA.ADMIN_USERS,
    id: "admin-roles",
    outcome: "The admin defines a role with its permissions and gives it to a user",
    reason: "The roles are admin and customer in auth.roles.ts; there is no role editor.",
    status: FLOW_STATUS.TO_BUILD,
  },
] as const satisfies readonly Flow[]
