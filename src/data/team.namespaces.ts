import type { LayoutNamespaces } from "~/src/data/namespaces"

export const TEAM_NAMESPACES = [
  { layout: "/admin/users", namespaces: ["pages.admin.users.invitations", "pages.admin.users.roles"] },
] as const satisfies readonly LayoutNamespaces[]
