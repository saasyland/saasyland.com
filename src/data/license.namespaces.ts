import type { LayoutNamespaces } from "~/src/data/namespaces"

export const LICENSE_NAMESPACES = [
  { layout: "/app", namespaces: ["pages.license", "pages.withdrawal", "withdrawal.validations"] },
  { layout: "/_site/_marketing", namespaces: ["withdrawal.validations"] },
  { layout: "/admin/users", namespaces: ["pages.admin.users.license"] },
] as const satisfies readonly LayoutNamespaces[]
