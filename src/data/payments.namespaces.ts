import type { LayoutNamespaces } from "~/src/data/namespaces"

export const PAYMENTS_NAMESPACES = [
  { layout: "/admin/users", namespaces: ["pages.admin.customers", "pages.admin.orders"] },
] as const satisfies readonly LayoutNamespaces[]
