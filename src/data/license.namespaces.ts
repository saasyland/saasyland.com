import type { LayoutNamespaces } from "~/src/data/namespaces"

export const LICENSE_NAMESPACES = [
  { layout: "/app", namespaces: ["pages.license"] },
  { layout: "/admin/users", namespaces: ["pages.admin.users.license"] },
] as const satisfies readonly LayoutNamespaces[]
