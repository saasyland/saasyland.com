import type { BrowserArea } from "~/src/areas/browser"

export const PAYMENTS_BROWSER = {
  layoutNamespaces: [{ layout: "/admin/users", namespaces: ["pages.admin.customers", "pages.admin.orders"] }],
  name: "payments",
} as const satisfies BrowserArea
