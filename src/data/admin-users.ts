import { ROUTES } from "~/src/routes"

export const ADMIN_INVITATION_ROWS = [
  { email: "alex.chen@example.com", id: "i1", statusColor: "amber" },
  { email: "m.roberts@startup.io", id: "i2", statusColor: "amber" },
  { email: "k.williams@acme.co", id: "i3", statusColor: "rose" },
  { email: "j.miller@example.com", id: "i4", statusColor: "amber" },
  { email: "s.taylor@designco.com", id: "i5", statusColor: "rose" },
] as const

export const ADMIN_ROLE_ROWS = [
  { id: "r1", usersCount: 3 },
  { id: "r2", usersCount: 12 },
  { id: "r3", usersCount: 5 },
  { id: "r4", usersCount: 28 },
  { id: "r5", usersCount: 2 },
] as const

export const ADMIN_USERS_TABS = [
  { href: ROUTES.ADMIN_USERS_ALL, id: "allUsers" },
  { href: ROUTES.ADMIN_USERS_INVITATIONS, id: "invitations" },
  { href: ROUTES.ADMIN_USERS_ROLES, id: "roles" },
  { href: ROUTES.ADMIN_USERS_SECURITY, id: "security" },
] as const
