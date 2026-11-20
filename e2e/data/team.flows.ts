import { FLOW_AREA, FLOW_STATUS, type Flow } from "./flows"

export const TEAM_FLOWS = [
  {
    area: FLOW_AREA.ADMIN_USERS,
    id: "admin-invitations",
    outcome: "The admin invites a teammate by email, and the invitation can be accepted, resent or revoked",
    reason: "/admin/users/invitations shows the sample rows of src/data/admin-team.ts.",
    status: FLOW_STATUS.TO_BUILD,
  },
  {
    area: FLOW_AREA.ADMIN_USERS,
    id: "admin-roles",
    outcome: "The admin defines a role with its permissions and gives it to a user",
    reason: "/admin/users/roles shows the sample rows of src/data/admin-team.ts.",
    status: FLOW_STATUS.TO_BUILD,
  },
] as const satisfies readonly Flow[]
