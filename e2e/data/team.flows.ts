import { FLOW_AREA, FLOW_STATUS, type Flow } from "./flows"

export const TEAM_FLOWS = [
  {
    area: FLOW_AREA.ADMIN_USERS,
    id: "admin-invitations",
    outcome:
      "The admin invites a person by email with a role, and the invitee chooses a name and a password from the emailed link and lands signed in with that role",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "admin-invitations.spec.ts",
        title: "an admin invites a person as an admin, who chooses a name and password and lands in the admin console",
      },
    ],
  },
  {
    area: FLOW_AREA.ADMIN_USERS,
    id: "invitation-resend",
    outcome: "Resending an invitation emails a new link, and the earlier link stops working",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "admin-invitations.spec.ts", title: "resending an invitation sends a new link, and the earlier one stops working" }],
  },
  {
    area: FLOW_AREA.ADMIN_USERS,
    id: "invitation-revoke",
    outcome: "Revoking an invitation takes it off the list, and its link says it was withdrawn",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "admin-invitations.spec.ts", title: "revoking an invitation takes it off the list and its link says it was withdrawn" }],
  },
  {
    area: FLOW_AREA.ADMIN_USERS,
    id: "invitation-expired",
    outcome: "An invitation whose link expired is marked on the list, and the link asks for a new one",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "admin-invitations.spec.ts", title: "an expired invitation is marked on the list and its link asks for a new one" }],
  },
  {
    area: FLOW_AREA.ADMIN_USERS,
    id: "invitation-provider",
    outcome: "An invitee continues with Google or GitHub, comes back to the invitation signed in and accepts it",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "admin-invitations.spec.ts", title: "an invitee who continues with GitHub under the invited address comes back signed in and accepts the role" }],
  },
  {
    area: FLOW_AREA.ADMIN_USERS,
    id: "invitation-signed-in",
    outcome: "An invitee signed in with the invited address accepts the invitation and gets its role; one signed in with another address is asked to sign out",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "admin-invitations.spec.ts", title: "an invitee who continues with GitHub under the invited address comes back signed in and accepts the role" },
      { spec: "admin-invitations.spec.ts", title: "an invitee signed in with another address is told so, signs out and can then accept with the invited one" },
    ],
  },
  {
    area: FLOW_AREA.ADMIN_USERS,
    id: "admin-roles",
    outcome: "The admin defines a role with its permissions and gives it to a user",
    reason: "The roles are admin and customer in auth.roles.ts; there is no role editor.",
    status: FLOW_STATUS.TO_BUILD,
  },
] as const satisfies readonly Flow[]
